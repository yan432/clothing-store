"""Notion sync — pushes product availability from Supabase to a Notion database.

Required env vars:
  NOTION_API_KEY          — Integration token from notion.so/my-integrations
  NOTION_PARENT_PAGE_ID   — ID of the Notion page to create the database inside
                            (grab from the page URL: notion.so/<page-id>)

The Notion database ID is stored in the Supabase settings table under key
"notion_database_id" after first sync. Subsequent syncs update existing rows.
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
