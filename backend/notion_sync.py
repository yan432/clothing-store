"""Notion sync — pushes product availability and orders from Supabase to Notion.

Required env vars:
  NOTION_API_KEY               — Integration token from notion.so/my-integrations
  NOTION_PARENT_PAGE_ID        — Page ID for the products database
  NOTION_ORDERS_PARENT_PAGE_ID — Page ID where the orders database will be created
                                  (grab from the page URL: notion.so/<page-id>)

Database IDs are stored in the Supabase settings table:
  notion_database_id        — products DB
  notion_orders_database_id — orders DB
"""

import os
from datetime import datetime, timezone
from typing import Optional

import requests

NOTION_VERSION = "2022-06-28"
NOTION_BASE = "https://api.notion.com/v1"


def _headers() -> dict:
    key = os.getenv("NOTION_API_KEY", "")
    if not key:
        raise ValueError("NOTION_API_KEY env var is not set")
    return {
        "Authorization": f"Bearer {key}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _notion_post(path: str, body: dict) -> dict:
    r = requests.post(f"{NOTION_BASE}{path}", json=body, headers=_headers(), timeout=15)
    r.raise_for_status()
    return r.json()


def _notion_patch(path: str, body: dict) -> dict:
    r = requests.patch(f"{NOTION_BASE}{path}", json=body, headers=_headers(), timeout=15)
    r.raise_for_status()
    return r.json()


def _notion_get(path: str) -> dict:
    r = requests.get(f"{NOTION_BASE}{path}", headers=_headers(), timeout=15)
    r.raise_for_status()
    return r.json()


def create_products_database(parent_page_id: str) -> str:
    """Create a new Notion database inside parent_page_id. Returns the database ID."""
    body = {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "title": [{"type": "text", "text": {"content": "Наличие товаров"}}],
        "properties": {
            "Название": {"title": {}},
            "Product ID": {"number": {"format": "number"}},
            "Категория": {"select": {}},
            "Цена (€)": {"number": {"format": "euro"}},
            "В наличии": {"number": {"format": "number"}},
            "Зарезервировано": {"number": {"format": "number"}},
            "Размеры": {"rich_text": {}},
            "Статус": {
                "select": {
                    "options": [
                        {"name": "В наличии", "color": "green"},
                        {"name": "Мало", "color": "yellow"},
                        {"name": "Нет в наличии", "color": "red"},
                        {"name": "Скрыт", "color": "gray"},
                    ]
                }
            },
            "Последняя синхронизация": {"date": {}},
        },
    }
    result = _notion_post("/databases", body)
    return result["id"]


def _query_all_db_pages(database_id: str) -> list[dict]:
    """Return all pages in a Notion database (handles pagination)."""
    pages = []
    body: dict = {"page_size": 100}
    while True:
        r = requests.post(
            f"{NOTION_BASE}/databases/{database_id}/query",
            json=body,
            headers=_headers(),
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        pages.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        body["start_cursor"] = data["next_cursor"]
    return pages


def _get_product_id_from_page(page: dict) -> Optional[int]:
    try:
        return int(page["properties"]["Product ID"]["number"])
    except (KeyError, TypeError, ValueError):
        return None


def _stock_status(available: int, is_hidden: bool) -> str:
    if is_hidden:
        return "Скрыт"
    if available <= 0:
        return "Нет в наличии"
    if available <= 3:
        return "Мало"
    return "В наличии"


def _sizes_text(size_rows: list[dict]) -> str:
    if not size_rows:
        return ""
    parts = []
    for row in sorted(size_rows, key=lambda r: r.get("size", "")):
        stock = int(row.get("stock", 0) or 0)
        reserved = int(row.get("reserved", 0) or 0)
        available = max(0, stock - reserved)
        parts.append(f"{row['size']}: {available}")
    return ", ".join(parts)


def _page_properties(product: dict, sizes_text: str, now_iso: str) -> dict:
    available = max(0, int(product.get("available_stock") or product.get("stock") or 0))
    reserved = int(product.get("reserved_stock") or 0)
    is_hidden = bool(product.get("is_hidden", False))

    return {
        "Название": {"title": [{"text": {"content": product.get("name", "")}}]},
        "Product ID": {"number": product["id"]},
        "Категория": {"select": {"name": product.get("category") or "Без категории"}},
        "Цена (€)": {"number": float(product.get("price") or 0)},
        "В наличии": {"number": available},
        "Зарезервировано": {"number": reserved},
        "Размеры": {
            "rich_text": [{"text": {"content": sizes_text}}] if sizes_text else []
        },
        "Статус": {"select": {"name": _stock_status(available, is_hidden)}},
        "Последняя синхронизация": {"date": {"start": now_iso}},
    }


def sync_products_to_notion(
    supabase_client,
    parent_page_id: str,
    existing_database_id: Optional[str],
) -> dict:
    """Main sync function.

    Returns a dict with:
      database_id  — the Notion DB id (create or reuse)
      created      — number of new rows created
      updated      — number of rows updated
      errors       — list of error strings
    """
    errors = []
    created = 0
    updated = 0

    # ── 1. Ensure database exists ────────────────────────────────────────────
    database_id = existing_database_id
    if not database_id:
        database_id = create_products_database(parent_page_id)

    # ── 2. Fetch all products from Supabase ──────────────────────────────────
    products_resp = supabase_client.table("products").select(
        "id, name, category, price, available_stock, reserved_stock, stock, is_hidden"
    ).execute()
    products = products_resp.data or []

    # Fetch all size-stock rows in one shot, then group by product_id
    size_resp = supabase_client.table("product_size_stock").select(
        "product_id, size, stock, reserved"
    ).execute()
    size_by_product: dict[int, list] = {}
    for row in (size_resp.data or []):
        pid = row["product_id"]
        size_by_product.setdefault(pid, []).append(row)

    # ── 3. Build map of existing Notion rows: product_id → page_id ──────────
    existing_pages = _query_all_db_pages(database_id)
    existing_map: dict[int, str] = {}
    for page in existing_pages:
        pid = _get_product_id_from_page(page)
        if pid is not None:
            existing_map[pid] = page["id"]

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")

    # ── 4. Upsert each product ───────────────────────────────────────────────
    for product in products:
        pid = product["id"]
        sizes_text = _sizes_text(size_by_product.get(pid, []))
        props = _page_properties(product, sizes_text, now_iso)

        try:
            if pid in existing_map:
                _notion_patch(f"/pages/{existing_map[pid]}", {"properties": props})
                updated += 1
            else:
                _notion_post(
                    "/pages",
                    {
                        "parent": {"database_id": database_id},
                        "properties": props,
                    },
                )
                created += 1
        except Exception as e:
            errors.append(f"Product {pid} ({product.get('name')}): {e}")

    return {
        "database_id": database_id,
        "created": created,
        "updated": updated,
        "total": len(products),
        "errors": errors,
    }


# ── Orders sync ───────────────────────────────────────────────────────────────

_ORDER_STATUS_COLORS = {
    "pending": "yellow",
    "paid": "blue",
    "shipped": "purple",
    "delivered": "green",
    "payment_failed": "red",
    "cancelled": "gray",
}

_ALL_ORDER_STATUSES = list(_ORDER_STATUS_COLORS.keys())


def create_orders_database(parent_page_id: str) -> str:
    """Create a Notion orders database inside parent_page_id. Returns the database ID."""
    body = {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "title": [{"type": "text", "text": {"content": "Заказы"}}],
        "properties": {
            "Номер заказа": {"title": {}},
            "Order ID": {"number": {"format": "number"}},
            "Статус": {
                "select": {
                    "options": [
                        {"name": k, "color": v}
                        for k, v in _ORDER_STATUS_COLORS.items()
                    ]
                }
            },
            "Email": {"email": {}},
            "Имя покупателя": {"rich_text": {}},
            "Телефон": {"phone_number": {}},
            "Товары": {"rich_text": {}},
            "Сумма (€)": {"number": {"format": "euro"}},
            "Промокод": {"rich_text": {}},
            "Адрес доставки": {"rich_text": {}},
            "Трекинг": {"url": {}},
            "Дата создания": {"date": {}},
            "Дата оплаты": {"date": {}},
            "Дата отправки": {"date": {}},
            "Последняя синхронизация": {"date": {}},
        },
    }
    result = _notion_post("/databases", body)
    return result["id"]


def _get_order_id_from_page(page: dict) -> Optional[int]:
    try:
        return int(page["properties"]["Order ID"]["number"])
    except (KeyError, TypeError, ValueError):
        return None


def _order_items_text(items: list) -> str:
    if not items:
        return ""
    parts = []
    for item in items:
        name = str(item.get("name") or "?")
        size = str(item.get("size") or "")
        qty = int(item.get("quantity") or 1)
        price = item.get("price")
        part = name
        if size:
            part += f" ({size})"
        part += f" ×{qty}"
        if price:
            part += f" — €{float(price):.2f}"
        parts.append(part)
    return "; ".join(parts)


def _order_address_text(order: dict) -> str:
    parts = [
        order.get("shipping_line1"),
        order.get("shipping_line2"),
        order.get("shipping_city"),
        order.get("shipping_state"),
        order.get("shipping_postal_code"),
        order.get("shipping_country"),
    ]
    return ", ".join(p for p in parts if p and str(p).strip())


def _rich_text(value: str, limit: int = 2000) -> list:
    text = str(value or "")[:limit]
    if not text:
        return []
    return [{"text": {"content": text}}]


def _order_page_properties(order: dict, now_iso: str) -> dict:
    import json as _json

    human_id = 10000 + int(order.get("id") or 0)
    items = order.get("items_json") or []
    metadata = order.get("metadata_json") or {}
    if isinstance(metadata, str):
        try:
            metadata = _json.loads(metadata)
        except Exception:
            metadata = {}

    promo_code = str(metadata.get("promo_code") or "").strip()
    items_text = _order_items_text(items)
    address_text = _order_address_text(order)
    status = str(order.get("status") or "pending")

    props: dict = {
        "Номер заказа": {"title": [{"text": {"content": f"#{human_id}"}}]},
        "Order ID": {"number": int(order["id"])},
        "Статус": {"select": {"name": status}},
        "Сумма (€)": {"number": float(order.get("amount_total") or 0)},
        "Последняя синхронизация": {"date": {"start": now_iso}},
    }

    if items_text:
        props["Товары"] = {"rich_text": _rich_text(items_text)}
    if address_text:
        props["Адрес доставки"] = {"rich_text": _rich_text(address_text)}

    email = str(order.get("email") or "").strip()
    if email:
        props["Email"] = {"email": email}

    name = str(order.get("shipping_name") or "").strip()
    if name:
        props["Имя покупателя"] = {"rich_text": _rich_text(name)}

    phone = str(order.get("phone") or "").strip()
    if phone:
        props["Телефон"] = {"phone_number": phone}

    if promo_code:
        props["Промокод"] = {"rich_text": _rich_text(promo_code)}

    tracking_url = str(order.get("tracking_url") or "").strip()
    if tracking_url:
        props["Трекинг"] = {"url": tracking_url}

    created_at = order.get("created_at")
    if created_at:
        props["Дата создания"] = {"date": {"start": str(created_at)}}

    paid_at = order.get("paid_at")
    if paid_at:
        props["Дата оплаты"] = {"date": {"start": str(paid_at)}}

    shipped_at = order.get("shipped_at")
    if shipped_at:
        props["Дата отправки"] = {"date": {"start": str(shipped_at)}}

    return props


def sync_orders_to_notion(
    supabase_client,
    parent_page_id: str,
    existing_database_id: Optional[str],
) -> dict:
    """Sync all orders (all statuses) from Supabase to a Notion database.

    Returns a dict with:
      database_id  — the Notion DB id (created or reused)
      created      — number of new rows created
      updated      — number of rows updated
      errors       — list of error strings
    """
    errors = []
    created = 0
    updated = 0

    # ── 1. Ensure database exists ────────────────────────────────────────────
    database_id = existing_database_id
    if not database_id:
        database_id = create_orders_database(parent_page_id)

    # ── 2. Fetch all orders from Supabase ────────────────────────────────────
    orders_resp = supabase_client.table("orders").select(
        "id, status, email, phone, shipping_name, "
        "shipping_line1, shipping_line2, shipping_city, shipping_state, "
        "shipping_postal_code, shipping_country, "
        "items_json, metadata_json, amount_total, "
        "created_at, paid_at, shipped_at, tracking_url"
    ).order("id").execute()
    orders = orders_resp.data or []

    # ── 3. Build map of existing Notion rows: order_id → page_id ─────────────
    existing_pages = _query_all_db_pages(database_id)
    existing_map: dict[int, str] = {}
    for page in existing_pages:
        oid = _get_order_id_from_page(page)
        if oid is not None:
            existing_map[oid] = page["id"]

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")

    # ── 4. Upsert each order ─────────────────────────────────────────────────
    for order in orders:
        oid = order["id"]
        props = _order_page_properties(order, now_iso)
        try:
            if oid in existing_map:
                _notion_patch(f"/pages/{existing_map[oid]}", {"properties": props})
                updated += 1
            else:
                _notion_post(
                    "/pages",
                    {
                        "parent": {"database_id": database_id},
                        "properties": props,
                    },
                )
                created += 1
        except Exception as e:
            errors.append(f"Order {oid}: {e}")

    return {
        "database_id": database_id,
        "created": created,
        "updated": updated,
        "total": len(orders),
        "errors": errors,
    }
