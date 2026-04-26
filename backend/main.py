from datetime import datetime, timezone
import os
import random
import re
import smtplib
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import unquote, urlparse
import uuid
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import stripe
from supabase import Client, create_client

load_dotenv()
app = FastAPI(title="Clothing Store API")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "https://www.edmclothes.net",
        "https://edmclothes.net",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

ORDER_PENDING = "pending"
ORDER_PAID = "paid"
ORDER_PAYMENT_FAILED = "payment_failed"
ORDER_CANCELLED = "cancelled"
RESEND_API_URL = "https://api.resend.com/emails"
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Store <onboarding@resend.dev>")
ORDER_ALERT_EMAIL = os.getenv("ORDER_ALERT_EMAIL")

# Zoho SMTP (приоритет над Resend если настроен)
ZOHO_SMTP_HOST = os.getenv("ZOHO_SMTP_HOST", "smtp.zoho.eu")
ZOHO_SMTP_PORT = int(os.getenv("ZOHO_SMTP_PORT", "587"))
ZOHO_SMTP_USER = os.getenv("ZOHO_SMTP_USER", "")
ZOHO_SMTP_PASSWORD = os.getenv("ZOHO_SMTP_PASSWORD", "")


class Product(BaseModel):
    name: str
    description: Optional[str] = None
    material_care: Optional[str] = None
    product_details: Optional[str] = None
    fit_info: Optional[str] = None
    price: float
    compare_price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    stock: int = 0
    available_stock: Optional[int] = None
    reserved_stock: Optional[int] = None
    is_hidden: bool = False
    tags: list = []
    slug: Optional[str] = None
    color_name: Optional[str] = None
    color_hex: Optional[str] = None
    color_group_id: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    material_care: Optional[str] = None
    product_details: Optional[str] = None
    fit_info: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    available_stock: Optional[int] = None
    reserved_stock: Optional[int] = None
    is_hidden: Optional[bool] = None
    tags: Optional[list] = None
    slug: Optional[str] = None
    color_name: Optional[str] = None
    color_hex: Optional[str] = None
    color_group_id: Optional[str] = None


class ProductImageDelete(BaseModel):
    image_url: str


class CheckoutItem(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    image_url: Optional[str] = None
    size: Optional[str] = None


class CheckoutRequest(BaseModel):
    items: list[CheckoutItem]
    success_url: str = f"{FRONTEND_URL}/success"
    cancel_url: str = f"{FRONTEND_URL}/cart"
    customer_email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    promo_code: Optional[str] = None
    comment: Optional[str] = None
    quick: bool = False  # True = quick checkout from cart; Stripe collects shipping


class PromoCodeCreate(BaseModel):
    code: Optional[str] = None
    discount_type: str
    discount_value: Optional[float] = None
    expires_at: Optional[str] = None
    usage_limit: Optional[int] = None


class PromoCodeUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    expires_at: Optional[str] = None
    usage_limit: Optional[int] = None
    is_active: Optional[bool] = None


class PromoCodeValidateResponse(BaseModel):
    valid: bool
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_amount: float = 0.0
    message: Optional[str] = None


class SubscriberCaptureRequest(BaseModel):
    email: str
    source: Optional[str] = "unknown"
    metadata: Optional[dict] = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def stripe_obj_to_dict(obj: Any) -> dict:
    if hasattr(obj, "to_dict_recursive"):
        return obj.to_dict_recursive()
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    if isinstance(obj, dict):
        return obj
    return {}


def as_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def money_eur(value: Any) -> str:
    return f"€{to_float(value):.2f}"


def first_non_empty(*values: Any) -> Optional[str]:
    for value in values:
        text = str(value or "").strip()
        if text:
            return text
    return None


def extract_shipping_fields(session_obj: dict) -> dict:
    shipping = as_dict(session_obj.get("shipping_details"))
    address = as_dict(shipping.get("address"))
    customer = as_dict(session_obj.get("customer_details"))
    customer_address = as_dict(customer.get("address"))
    return {
        "phone": first_non_empty(customer.get("phone")),
        "shipping_name": first_non_empty(shipping.get("name"), customer.get("name")),
        "shipping_line1": first_non_empty(address.get("line1"), customer_address.get("line1")),
        "shipping_line2": first_non_empty(address.get("line2"), customer_address.get("line2")),
        "shipping_city": first_non_empty(address.get("city"), customer_address.get("city")),
        "shipping_state": first_non_empty(address.get("state"), customer_address.get("state")),
        "shipping_postal_code": first_non_empty(address.get("postal_code"), customer_address.get("postal_code")),
        "shipping_country": first_non_empty(address.get("country"), customer_address.get("country")),
    }


def enrich_order_shipping(order: dict) -> dict:
    shipping = as_dict(order.get("shipping_json"))
    shipping_address = as_dict(shipping.get("address"))
    customer = as_dict(order.get("customer_json"))
    customer_address = as_dict(customer.get("address"))
    return {
        **order,
        "phone": first_non_empty(order.get("phone"), customer.get("phone")),
        "shipping_name": first_non_empty(order.get("shipping_name"), shipping.get("name"), customer.get("name")),
        "shipping_line1": first_non_empty(order.get("shipping_line1"), shipping_address.get("line1"), customer_address.get("line1")),
        "shipping_line2": first_non_empty(order.get("shipping_line2"), shipping_address.get("line2"), customer_address.get("line2")),
        "shipping_city": first_non_empty(order.get("shipping_city"), shipping_address.get("city"), customer_address.get("city")),
        "shipping_state": first_non_empty(order.get("shipping_state"), shipping_address.get("state"), customer_address.get("state")),
        "shipping_postal_code": first_non_empty(order.get("shipping_postal_code"), shipping_address.get("postal_code"), customer_address.get("postal_code")),
        "shipping_country": first_non_empty(order.get("shipping_country"), shipping_address.get("country"), customer_address.get("country")),
    }


def get_available_stock_value(product: dict) -> int:
    if product.get("available_stock") is not None:
        return int(product.get("available_stock") or 0)
    return int(product.get("stock") or 0)


def get_reserved_stock_value(product: dict) -> int:
    return int(product.get("reserved_stock") or 0)


def stock_snapshot_for_product(product: dict) -> dict:
    available = get_available_stock_value(product)
    reserved = get_reserved_stock_value(product)
    return {
        "available_stock": available,
        "reserved_stock": reserved,
        "stock": available,
    }


def compute_discount_percent(price: Any, compare_price: Any) -> Optional[int]:
    try:
        current = float(price or 0)
        previous = float(compare_price or 0)
    except (TypeError, ValueError):
        return None
    if previous <= 0 or previous <= current:
        return None
    return int(round((previous - current) / previous * 100))


def normalize_promo_code(value: Optional[str]) -> str:
    return str(value or "").strip().upper()


def normalize_email(value: Optional[str]) -> str:
    return str(value or "").strip().lower()


def capture_subscriber_email(raw_email: Optional[str], source: str, metadata: Optional[dict] = None) -> None:
    email = normalize_email(raw_email)
    if not email:
        return
    source_name = str(source or "unknown").strip() or "unknown"
    existing = supabase.table("email_subscribers").select("*").eq("email", email).limit(1).execute()
    row = existing.data[0] if existing.data else None
    now = now_iso()
    if not row:
        supabase.table("email_subscribers").insert({
            "email": email,
            "first_source": source_name,
            "last_source": source_name,
            "source_counts": {source_name: 1},
            "first_seen_at": now,
            "last_seen_at": now,
            "events_count": 1,
            "is_active": True,
            "metadata_json": metadata or {},
            "created_at": now,
            "updated_at": now,
        }).execute()
        return
    source_counts = as_dict(row.get("source_counts"))
    source_counts[source_name] = int(source_counts.get(source_name) or 0) + 1
    merged_metadata = as_dict(row.get("metadata_json"))
    merged_metadata.update(metadata or {})
    supabase.table("email_subscribers").update({
        "last_source": source_name,
        "source_counts": source_counts,
        "last_seen_at": now,
        "events_count": int(row.get("events_count") or 0) + 1,
        "is_active": True,
        "metadata_json": merged_metadata,
        "updated_at": now,
    }).eq("id", row["id"]).execute()


def generate_random_promo_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def get_active_promo_row(code: str) -> Optional[dict]:
    normalized = normalize_promo_code(code)
    if not normalized:
        return None
    result = supabase.table("promo_codes").select("*").eq("code", normalized).limit(1).execute()
    if not result.data:
        return None
    promo = result.data[0]
    if promo.get("is_active") is False:
        return None
    expires_at = promo.get("expires_at")
    if expires_at:
        try:
            expires_dt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
            if expires_dt <= datetime.now(timezone.utc):
                return None
        except ValueError:
            return None
    usage_limit = promo.get("usage_limit")
    used_count = int(promo.get("used_count") or 0)
    if usage_limit is not None and int(usage_limit) <= used_count:
        return None
    return promo


def promo_discount_amount(subtotal: float, promo: dict, shipping_cost: float = 0.0) -> float:
    subtotal_safe = max(0.0, float(subtotal or 0))
    shipping_safe = max(0.0, float(shipping_cost or 0))
    dtype = str(promo.get("discount_type") or "").lower()
    value = float(promo.get("discount_value") or 0)
    if dtype == "free_shipping":
        return round(shipping_safe, 2)
    if subtotal_safe <= 0 or value <= 0:
        return 0.0
    if dtype == "percent":
        raw = subtotal_safe * (value / 100.0)
        return round(min(subtotal_safe, raw), 2)
    if dtype == "fixed":
        return round(min(subtotal_safe, value), 2)
    return 0.0


def increment_promo_usage_if_needed(order: dict) -> None:
    metadata = as_dict(order.get("metadata_json"))
    promo_code = normalize_promo_code(metadata.get("promo_code"))
    if not promo_code:
        return
    data = supabase.table("promo_codes").select("id, used_count").eq("code", promo_code).limit(1).execute()
    if not data.data:
        return
    promo = data.data[0]
    used_count = int(promo.get("used_count") or 0)
    supabase.table("promo_codes").update({"used_count": used_count + 1}).eq("id", promo["id"]).execute()


def get_setting(key: str, default: str = "") -> str:
    try:
        row = supabase.table("settings").select("value").eq("key", key).limit(1).execute()
        if row.data:
            return str(row.data[0].get("value") or default)
    except Exception:
        pass
    return default


def get_settings_bulk(keys: list[str]) -> dict:
    try:
        rows = supabase.table("settings").select("key,value").in_("key", keys).execute()
        return {r["key"]: str(r.get("value") or "") for r in (rows.data or [])}
    except Exception:
        return {}


def send_email_zoho(to_email: str, subject: str, html: str, text: str, from_name: str = "") -> bool:
    if not ZOHO_SMTP_USER or not ZOHO_SMTP_PASSWORD:
        return False
    try:
        msg = MIMEMultipart("alternative")
        display_name = from_name or get_setting("email_from_name", "EDM Clothes")
        msg["From"] = f"{display_name} <{ZOHO_SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP(ZOHO_SMTP_HOST, ZOHO_SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD)
            server.sendmail(ZOHO_SMTP_USER, to_email, msg.as_string())
        return True
    except Exception as exc:
        print(f"Zoho SMTP error: {exc}")
        return False


def send_resend_email(to_email: str, subject: str, html: str, text: str) -> None:
    if not RESEND_API_KEY:
        print("Resend is not configured: RESEND_API_KEY is missing")
        return
    target = str(to_email or "").strip()
    if not target:
        return
    sender = str(RESEND_FROM_EMAIL or "").strip() or "Store <onboarding@resend.dev>"
    try:
        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"from": sender, "to": [target], "subject": subject, "html": html, "text": text},
            timeout=8,
        )
        if response.status_code >= 400:
            print(f"Resend email failed ({response.status_code}): {response.text[:300]}")
    except requests.RequestException as exc:
        print(f"Resend email request error: {exc}")


def send_email(to_email: str, subject: str, html: str, text: str) -> None:
    """Отправляет через Zoho SMTP (приоритет) или Resend как fallback."""
    target = str(to_email or "").strip()
    if not target:
        return
    if send_email_zoho(target, subject, html, text):
        return
    send_resend_email(target, subject, html, text)


def order_items_html(items: list[dict]) -> str:
    lines = []
    for item in items:
        name = str(item.get("name") or "Item")
        qty = int(item.get("quantity") or 0)
        size = str(item.get("size") or "").strip()
        price = to_float(item.get("price"))
        line_total = price * qty
        size_suffix = f" (size: {size})" if size else ""
        lines.append(
            f"<tr><td style='padding:6px 0'>{name}{size_suffix}</td>"
            f"<td style='padding:6px 0;text-align:center'>{qty}</td>"
            f"<td style='padding:6px 0;text-align:right'>{money_eur(line_total)}</td></tr>"
        )
    return "".join(lines)


def order_items_text(items: list[dict]) -> str:
    text_lines = []
    for item in items:
        name = str(item.get("name") or "Item")
        qty = int(item.get("quantity") or 0)
        size = str(item.get("size") or "").strip()
        price = to_float(item.get("price"))
        line_total = price * qty
        size_suffix = f" (size: {size})" if size else ""
        text_lines.append(f"- {name}{size_suffix} x{qty}: {money_eur(line_total)}")
    return "\n".join(text_lines)


def send_order_confirmation_emails(order: dict) -> None:
    items = order.get("items_json") or []
    metadata = as_dict(order.get("metadata_json"))
    subtotal = sum(to_float(item.get("price")) * int(item.get("quantity") or 0) for item in items)
    promo_discount = to_float(metadata.get("promo_discount_amount"))
    shipping = max(0.0, to_float(order.get("amount_total")) - subtotal + promo_discount)
    total = to_float(order.get("amount_total"))
    order_id = order.get("id")
    order_ref = order.get("client_reference_id")
    customer_email = str(order.get("email") or "").strip()
    customer_name = str(order.get("shipping_name") or "").strip() or "Customer"
    shipping_address = ", ".join([
        str(order.get("shipping_line1") or "").strip(),
        str(order.get("shipping_city") or "").strip(),
        str(order.get("shipping_postal_code") or "").strip(),
        str(order.get("shipping_country") or "").strip(),
    ]).strip(", ").strip()

    # Загружаем настройки из БД
    cfg = get_settings_bulk([
        "email_order_subject", "email_order_greeting",
        "email_order_message", "email_order_footer", "email_admin_subject",
    ])

    items_html = order_items_html(items)
    items_text = order_items_text(items)
    promo_row_html = ""
    promo_row_text = ""
    if promo_discount > 0:
        promo_row_html = f"<tr><td style='padding:4px 0'>Discount</td><td></td><td style='text-align:right'>-{money_eur(promo_discount)}</td></tr>"
        promo_row_text = f"Discount: -{money_eur(promo_discount)}\n"

    subject_tpl = cfg.get("email_order_subject") or "Order confirmation #{order_id} — EDM Clothes"
    greeting_tpl = cfg.get("email_order_greeting") or "Thanks for your order, {customer_name}!"
    message_tpl = cfg.get("email_order_message") or "We received your order and started processing it."
    footer_tpl = cfg.get("email_order_footer") or "EDM Clothes"

    def fmt(s):
        return s.replace("{order_id}", str(order_id)).replace("{customer_name}", customer_name).replace("{total}", money_eur(total))

    customer_subject = fmt(subject_tpl)
    greeting = fmt(greeting_tpl)
    message = fmt(message_tpl)
    footer = fmt(footer_tpl)

    customer_html = f"""
      <div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto">
        <h2 style="margin-bottom:4px">{greeting}</h2>
        <p style="color:#555">{message}</p>
        <p><strong>Order #{order_id}</strong> &nbsp;·&nbsp; Ref: {order_ref or '-'}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead><tr style="border-bottom:2px solid #eee">
            <th align="left" style="padding:6px 0">Item</th>
            <th align="center" style="padding:6px 0">Qty</th>
            <th align="right" style="padding:6px 0">Price</th>
          </tr></thead>
          <tbody>{items_html}</tbody>
        </table>
        <table style="width:100%;margin-bottom:16px">
          <tr><td style="color:#888">Subtotal</td><td align="right">{money_eur(subtotal)}</td></tr>
          {promo_row_html}
          <tr><td style="color:#888">Shipping</td><td align="right">{money_eur(shipping)}</td></tr>
          <tr style="font-weight:700;font-size:16px">
            <td style="padding-top:8px">Total</td>
            <td align="right" style="padding-top:8px">{money_eur(total)}</td>
          </tr>
        </table>
        <p><strong>Shipping address:</strong><br/>{shipping_address or 'Not provided'}</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-size:12px;color:#aaa">{footer}</p>
      </div>
    """
    customer_text = (
        f"{greeting}\n\n{message}\n\n"
        f"Order #{order_id} · Ref: {order_ref or '-'}\n\n"
        f"{items_text}\n\n"
        f"Subtotal: {money_eur(subtotal)}\n"
        f"{promo_row_text}"
        f"Shipping: {money_eur(shipping)}\n"
        f"Total: {money_eur(total)}\n\n"
        f"Shipping address: {shipping_address or 'Not provided'}\n\n"
        f"{footer}"
    )
    send_email(customer_email, customer_subject, customer_html, customer_text)

    admin_target = str(ORDER_ALERT_EMAIL or "").strip()
    if admin_target:
        admin_subj_tpl = cfg.get("email_admin_subject") or "New order #{order_id} — {total}"
        admin_subject = fmt(admin_subj_tpl)
        admin_html = f"""
          <div style="font-family:Arial,sans-serif;color:#111">
            <h2>New paid order received</h2>
            <p><strong>Order #{order_id}</strong> · Ref: {order_ref or '-'}</p>
            <p><strong>Customer:</strong> {customer_email or '-'}</p>
            <p><strong>Shipping:</strong> {shipping_address or 'Not provided'}</p>
            <table style="width:100%;border-collapse:collapse">
              <thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Total</th></tr></thead>
              <tbody>{items_html}</tbody>
            </table>
            <hr/>
            <p><strong>Total: {money_eur(total)}</strong></p>
          </div>
        """
        admin_text = (
            f"New order #{order_id}\nCustomer: {customer_email}\n"
            f"Shipping: {shipping_address or '-'}\n\n{items_text}\n\nTotal: {money_eur(total)}"
        )
        send_email(admin_target, admin_subject, admin_html, admin_text)


def _make_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug or 'product'


def _unique_slug(base: str, exclude_id: int = None) -> str:
    candidate = base
    counter = 1
    while True:
        q = supabase.table("products").select("id").eq("slug", candidate)
        if exclude_id:
            q = q.neq("id", exclude_id)
        if not q.execute().data:
            return candidate
        candidate = f"{base}-{counter}"
        counter += 1


def get_product_row(product_id: int) -> dict:
    data = supabase.table("products").select("*").eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return data.data[0]


def get_visible_product_row(product_id: int) -> dict:
    data = supabase.table("products").select("*").eq("id", product_id).eq("is_hidden", False).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return data.data[0]


def _storage_public_urls_for_product(product_id: int) -> list[str]:
    folder = str(product_id)
    files = supabase.storage.from_("product-images").list(folder)
    if not files:
        return []

    urls: list[str] = []
    for f in files:
        name = f.get("name")
        if not name:
            continue
        path = f"{folder}/{name}"
        public_url = supabase.storage.from_("product-images").get_public_url(path)
        urls.append(public_url)
    return urls


def _storage_path_from_public_url(public_url: str) -> Optional[str]:
    if not public_url:
        return None
    parsed = urlparse(public_url)
    marker = "/storage/v1/object/public/product-images/"
    if marker not in parsed.path:
        return None
    return unquote(parsed.path.split(marker, 1)[1])


def _decorate_product_with_images(product: dict) -> dict:
    # Get live files from Storage
    storage_urls = _storage_public_urls_for_product(product["id"])
    storage_set = set(storage_urls)

    # DB image_urls is the source of truth for ordering
    db_urls = product.get("image_urls") or []
    if isinstance(db_urls, str):
        try:
            import json as _json
            db_urls = _json.loads(db_urls)
        except Exception:
            db_urls = []

    # Respect DB order, but also include any Storage files not yet in DB
    db_in_storage = [u for u in db_urls if u in storage_set]
    storage_not_in_db = [u for u in storage_urls if u not in set(db_urls)]
    if db_in_storage or storage_not_in_db:
        image_urls = db_in_storage + storage_not_in_db
    else:
        # Fallback: no storage, use raw DB list
        image_urls = list(db_urls)

    legacy_cover = product.get("image_url")
    if legacy_cover and legacy_cover not in image_urls:
        image_urls = [legacy_cover, *image_urls]

    cover = image_urls[0] if image_urls else legacy_cover
    return {
        **product,
        **stock_snapshot_for_product(product),
        "image_url": cover,
        "image_urls": image_urls,
        "tags": compute_auto_tags(product),
        "compare_price": product.get("compare_price"),
        "discount_percent": compute_discount_percent(product.get("price"), product.get("compare_price")),
    }

def reserve_stock(items: list[dict]) -> None:
    quantities_by_product: dict[int, int] = {}
    for item in items:
        product_id = int(item["id"])
        qty = max(0, int(item["quantity"]))
        quantities_by_product[product_id] = quantities_by_product.get(product_id, 0) + qty

    products_map: dict[int, dict] = {}
    for product_id, qty in quantities_by_product.items():
        product = get_product_row(product_id)
        available = get_available_stock_value(product)
        if available < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for product {product_id}",
            )
        products_map[product_id] = product

    for product_id, qty in quantities_by_product.items():
        product = products_map[product_id]
        available = get_available_stock_value(product)
        reserved = get_reserved_stock_value(product)
        supabase.table("products").update({
            "available_stock": available - qty,
            "reserved_stock": reserved + qty,
            "stock": available - qty,
        }).eq("id", product_id).execute()


def release_reserved_stock(items: list[dict]) -> None:
    quantities_by_product: dict[int, int] = {}
    for item in items:
        product_id = int(item["id"])
        qty = max(0, int(item["quantity"]))
        quantities_by_product[product_id] = quantities_by_product.get(product_id, 0) + qty

    for product_id, qty in quantities_by_product.items():
        product = get_product_row(product_id)
        available = get_available_stock_value(product)
        reserved = get_reserved_stock_value(product)
        new_reserved = max(0, reserved - qty)
        returned = reserved - new_reserved
        supabase.table("products").update({
            "available_stock": available + returned,
            "reserved_stock": new_reserved,
            "stock": available + returned,
        }).eq("id", product_id).execute()


def finalize_paid_stock(items: list[dict]) -> None:
    quantities_by_product: dict[int, int] = {}
    for item in items:
        product_id = int(item["id"])
        qty = max(0, int(item["quantity"]))
        quantities_by_product[product_id] = quantities_by_product.get(product_id, 0) + qty

    for product_id, qty in quantities_by_product.items():
        product = get_product_row(product_id)
        reserved = get_reserved_stock_value(product)
        new_reserved = max(0, reserved - qty)
        supabase.table("products").update({
            "reserved_stock": new_reserved,
            "stock": get_available_stock_value(product),
        }).eq("id", product_id).execute()


def find_order(client_reference_id: Optional[str], stripe_session_id: Optional[str]) -> Optional[dict]:
    if client_reference_id:
        by_ref = supabase.table("orders").select("*").eq("client_reference_id", client_reference_id).limit(1).execute()
        if by_ref.data:
            return by_ref.data[0]
    if stripe_session_id:
        by_session = supabase.table("orders").select("*").eq("stripe_session_id", stripe_session_id).limit(1).execute()
        if by_session.data:
            return by_session.data[0]
    return None


def save_webhook_event_once(event: dict) -> bool:
    event_id = event.get("id")
    if not event_id:
        return False
    existing = supabase.table("stripe_webhook_events").select("event_id").eq("event_id", event_id).limit(1).execute()
    if existing.data:
        return False
    supabase.table("stripe_webhook_events").insert({
        "event_id": event_id,
        "event_type": event.get("type"),
        "stripe_created_at": event.get("created"),
        "received_at": now_iso(),
        "payload_json": event,
    }).execute()
    return True


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/products")
def get_products():
    data = supabase.table("products").select("*").eq("is_hidden", False).execute()
    products = data.data or []
    result = []
    for p in products:
        db_urls = p.get("image_urls") or []
        if isinstance(db_urls, str):
            try:
                import json as _json
                db_urls = _json.loads(db_urls)
            except Exception:
                db_urls = []
        cover = p.get("image_url")
        if cover and cover not in db_urls:
            db_urls = [cover, *db_urls]
        result.append({
            **p,
            "image_urls": db_urls,
            "image_url": db_urls[0] if db_urls else cover,
            **stock_snapshot_for_product(p),
            "tags": compute_auto_tags(p),
            "compare_price": p.get("compare_price"),
            "discount_percent": compute_discount_percent(p.get("price"), p.get("compare_price")),
        })
    return result


@app.get("/products/admin")
def get_products_admin():
    data = supabase.table("products").select("*").order("id").execute()
    # Fast admin listing: avoid per-product storage listing.
    return [{**p, **stock_snapshot_for_product(p)} for p in data.data]


def _get_color_variants(product: dict) -> list:
    """Return sibling color variants (excluding current product), or []."""
    group_id = product.get("color_group_id")
    if not group_id:
        return []
    rows = supabase.table("products").select(
        "id, name, slug, color_name, color_hex, image_url, image_urls, available_stock, stock, is_hidden"
    ).eq("color_group_id", group_id).execute()
    variants = []
    for row in (rows.data or []):
        if row["id"] == product["id"]:
            continue
        cover = row.get("image_url")
        db_urls = row.get("image_urls") or []
        variants.append({
            "id": row["id"],
            "name": row["name"],
            "slug": row.get("slug") or str(row["id"]),
            "color_name": row.get("color_name"),
            "color_hex": row.get("color_hex"),
            "image_url": cover,
            "hover_image_url": db_urls[1] if len(db_urls) > 1 else cover,
            "in_stock": (row.get("available_stock") or row.get("stock") or 0) > 0,
            "is_hidden": bool(row.get("is_hidden")),
        })
    return variants


@app.get("/products/{product_id}")
def get_product(product_id: str):
    if product_id.lstrip('-').isdigit():
        product = _decorate_product_with_images(get_visible_product_row(int(product_id)))
    else:
        data = supabase.table("products").select("*").eq("slug", product_id).eq("is_hidden", False).execute()
        if not data.data:
            raise HTTPException(status_code=404, detail="Товар не найден")
        product = _decorate_product_with_images(data.data[0])
    product["color_variants"] = _get_color_variants(product)
    return product


@app.get("/products/admin/{product_id}")
def get_product_admin(product_id: int):
    return _decorate_product_with_images(get_product_row(product_id))


@app.post("/products")
def create_product(product: Product):
    payload = {k: v for k, v in product.dict().items() if v is not None}
    if not payload.get("slug"):
        payload["slug"] = _unique_slug(_make_slug(product.name))
    payload.setdefault("stock", 0)
    payload.setdefault("is_hidden", False)
    payload.setdefault("tags", [])

    try:
        data = supabase.table("products").insert(payload).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not data.data:
        raise HTTPException(status_code=500, detail="Insert returned no data")
    new_product = data.data[0]

    urls = _storage_public_urls_for_product(new_product["id"])
    supabase.table("products").update({"image_urls": urls}).eq("id", new_product["id"]).execute()

    return {**new_product, "image_urls": urls}


@app.put("/products/{product_id}")
def update_product(product_id: int, product: ProductUpdate):
    existing = get_product_row(product_id)
    updates = product.dict(exclude_unset=True)

    if "available_stock" in updates and updates["available_stock"] is not None:
        updates["available_stock"] = max(0, int(updates["available_stock"]))
    if "reserved_stock" in updates and updates["reserved_stock"] is not None:
        updates["reserved_stock"] = max(0, int(updates["reserved_stock"]))

    next_available = updates.get("available_stock", get_available_stock_value(existing))
    updates["stock"] = next_available

    if "slug" in updates and updates["slug"]:
        clean = _make_slug(updates["slug"])
        updates["slug"] = _unique_slug(clean, exclude_id=product_id)
    elif "name" in updates and not existing.get("slug"):
        updates["slug"] = _unique_slug(_make_slug(updates["name"]), exclude_id=product_id)

    data = supabase.table("products").update(updates).eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return _decorate_product_with_images(data.data[0])


@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    supabase.table("products").delete().eq("id", product_id).execute()
    return {"message": "Удалён"}


@app.post("/products/{product_id}/archive")
def archive_product(product_id: int):
    product = get_product_row(product_id)
    current_name = product.get("name") or f"Product {product_id}"
    archived_name = current_name if current_name.startswith("[ARCHIVED] ") else f"[ARCHIVED] {current_name}"
    data = supabase.table("products").update({
        "name": archived_name,
        "category": "archived",
        "available_stock": 0,
        "reserved_stock": 0,
        "stock": 0,
    }).eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return _decorate_product_with_images(data.data[0])


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    content = await file.read()

    supabase.storage.from_("product-images").upload(
        filename,
        content,
        {"content-type": file.content_type}
    )

    url = supabase.storage.from_("product-images").get_public_url(filename)
    return {"url": url}


@app.put("/products/{product_id}/image")
async def update_product_image(
    product_id: int,
    files: list[UploadFile] = File(default=[]),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    uploaded_urls: list[str] = []
    for file in files:
        ext = (file.filename or "jpg").split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        path = f"{product_id}/{filename}"
        content = await file.read()
        supabase.storage.from_("product-images").upload(
            path,
            content,
            {"content-type": file.content_type}
        )
        uploaded_urls.append(supabase.storage.from_("product-images").get_public_url(path))

    # Append new URLs to existing image_urls in DB (preserve order)
    existing = get_product_row(product_id)
    existing_urls = existing.get("image_urls") or []
    if isinstance(existing_urls, str):
        try:
            import json as _json
            existing_urls = _json.loads(existing_urls)
        except Exception:
            existing_urls = []
    merged = list(existing_urls) + [u for u in uploaded_urls if u not in existing_urls]
    cover = existing.get("image_url") or merged[0]
    data = supabase.table("products").update({"image_url": cover, "image_urls": merged}).eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return _decorate_product_with_images(data.data[0])


@app.delete("/products/{product_id}/image")
def delete_product_image(product_id: int, payload: ProductImageDelete):
    product = get_product_row(product_id)
    path = _storage_path_from_public_url(payload.image_url)
    if not path:
        raise HTTPException(status_code=400, detail="Invalid image URL")

    supabase.storage.from_("product-images").remove([path])

    # Remove from DB image_urls list
    db_urls = product.get("image_urls") or []
    if isinstance(db_urls, str):
        try:
            import json as _json
            db_urls = _json.loads(db_urls)
        except Exception:
            db_urls = []
    remaining = [u for u in db_urls if u != payload.image_url]
    next_cover = remaining[0] if remaining else None
    data = supabase.table("products").update({"image_url": next_cover, "image_urls": remaining}).eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return _decorate_product_with_images(data.data[0])


class ProductImagesReorder(BaseModel):
    image_urls: list[str]

@app.put("/products/{product_id}/images/reorder")
def reorder_product_images(product_id: int, payload: ProductImagesReorder):
    """Save a new image order. First URL becomes the cover."""
    if not payload.image_urls:
        raise HTTPException(status_code=400, detail="image_urls must not be empty")
    cover = payload.image_urls[0]
    data = supabase.table("products").update({
        "image_url": cover,
        "image_urls": payload.image_urls,
    }).eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return _decorate_product_with_images(data.data[0])


@app.get("/promo-codes/validate")
def validate_promo_code(code: str, subtotal: float = 0.0, shipping: float = 0.0):
    normalized = normalize_promo_code(code)
    if not normalized:
        return PromoCodeValidateResponse(valid=False, message="Enter promo code")
    promo = get_active_promo_row(normalized)
    if not promo:
        return PromoCodeValidateResponse(valid=False, message="Promo code is invalid or expired")
    discount_amount = promo_discount_amount(subtotal, promo, shipping)
    if discount_amount <= 0:
        return PromoCodeValidateResponse(valid=False, message="Promo code does not apply")
    return PromoCodeValidateResponse(
        valid=True,
        code=normalized,
        discount_type=promo.get("discount_type"),
        discount_value=float(promo.get("discount_value") or 0),
        discount_amount=discount_amount,
        message="Promo code applied",
    )


@app.get("/promo-codes/admin")
def list_promo_codes_admin():
    data = supabase.table("promo_codes").select("*").order("created_at", desc=True).limit(300).execute()
    return data.data or []


@app.post("/promo-codes")
def create_promo_code(payload: PromoCodeCreate):
    discount_type = str(payload.discount_type or "").lower()
    if discount_type not in ("percent", "fixed", "free_shipping"):
        raise HTTPException(status_code=400, detail="discount_type must be percent, fixed, or free_shipping")
    discount_value = float(payload.discount_value or 0)
    if discount_type in ("percent", "fixed") and discount_value <= 0:
        raise HTTPException(status_code=400, detail="discount_value must be > 0")
    if discount_type == "percent" and discount_value > 100:
        raise HTTPException(status_code=400, detail="percent discount cannot exceed 100")
    if discount_type == "free_shipping":
        discount_value = 0.0

    code = normalize_promo_code(payload.code)
    if not code:
        for _ in range(8):
            candidate = generate_random_promo_code(8)
            exists = supabase.table("promo_codes").select("id").eq("code", candidate).limit(1).execute()
            if not exists.data:
                code = candidate
                break
    if not code:
        raise HTTPException(status_code=500, detail="Failed to generate promo code")

    usage_limit = payload.usage_limit
    if usage_limit is not None and int(usage_limit) < 1:
        raise HTTPException(status_code=400, detail="usage_limit must be >= 1")

    existing = supabase.table("promo_codes").select("id").eq("code", code).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Promo code already exists")

    insert_payload = {
        "code": code,
        "discount_type": discount_type,
        "discount_value": discount_value,
        "expires_at": payload.expires_at,
        "usage_limit": int(usage_limit) if usage_limit is not None else None,
        "used_count": 0,
        "is_active": True,
    }
    data = supabase.table("promo_codes").insert(insert_payload).execute()
    if not data.data:
        raise HTTPException(status_code=500, detail="Failed to create promo code")
    return data.data[0]


@app.put("/promo-codes/{promo_id}")
def update_promo_code(promo_id: int, payload: PromoCodeUpdate):
    updates = payload.dict(exclude_unset=True)
    existing_result = supabase.table("promo_codes").select("*").eq("id", promo_id).limit(1).execute()
    if not existing_result.data:
        raise HTTPException(status_code=404, detail="Promo code not found")
    existing = existing_result.data[0]

    if "code" in updates and updates["code"] is not None:
        updates["code"] = normalize_promo_code(updates["code"])
        if not updates["code"]:
            raise HTTPException(status_code=400, detail="Code cannot be empty")
        duplicate = supabase.table("promo_codes").select("id").eq("code", updates["code"]).neq("id", promo_id).limit(1).execute()
        if duplicate.data:
            raise HTTPException(status_code=400, detail="Promo code already exists")

    next_discount_type = str(updates.get("discount_type", existing.get("discount_type")) or "").lower()
    if next_discount_type not in ("percent", "fixed", "free_shipping"):
        raise HTTPException(status_code=400, detail="discount_type must be percent, fixed, or free_shipping")
    updates["discount_type"] = next_discount_type

    if next_discount_type == "free_shipping":
        updates["discount_value"] = 0.0
    else:
        next_discount_value = float(updates.get("discount_value", existing.get("discount_value")) or 0)
        if next_discount_value <= 0:
            raise HTTPException(status_code=400, detail="discount_value must be > 0")
        if next_discount_type == "percent" and next_discount_value > 100:
            raise HTTPException(status_code=400, detail="percent discount cannot exceed 100")
        updates["discount_value"] = next_discount_value

    if "usage_limit" in updates and updates["usage_limit"] is not None and int(updates["usage_limit"]) < 1:
        raise HTTPException(status_code=400, detail="usage_limit must be >= 1")

    data = supabase.table("promo_codes").update(updates).eq("id", promo_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Promo code not found")
    return data.data[0]


@app.delete("/promo-codes/{promo_id}")
def delete_promo_code(promo_id: int):
    data = supabase.table("promo_codes").delete().eq("id", promo_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Promo code not found")
    return {"message": "Promo code deleted"}


SHIPPING_COST = 30.0


def extract_origin_url(value: Any) -> Optional[str]:
    parsed = urlparse(str(value or "").strip())
    if parsed.scheme in ("http", "https") and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return None


def resolve_checkout_origin(http_request: Request, payload: CheckoutRequest) -> str:
    candidates: list[Any] = [
        http_request.headers.get("origin"),
        http_request.headers.get("referer"),
        payload.success_url,
        payload.cancel_url,
        FRONTEND_URL,
    ]
    for candidate in candidates:
        base = extract_origin_url(candidate)
        if base:
            return base.rstrip("/")
    return "http://localhost:3000"


@app.post("/checkout")
def create_checkout(payload: CheckoutRequest, http_request: Request):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    normalized_items = []
    subtotal = 0.0
    line_items = []

    for item in payload.items:
        qty = max(1, int(item.quantity))
        price = max(0.01, float(item.price))
        normalized_item = {
            "id": int(item.id),
            "name": item.name,
            "price": price,
            "quantity": qty,
            "image_url": item.image_url,
            "size": item.size,
        }
        normalized_items.append(normalized_item)
        subtotal += price * qty
        line_items.append({
            "price_data": {
                "currency": "eur",
                "product_data": {
                    "name": item.name,
                    "images": [item.image_url] if item.image_url else [],
                    "metadata": {
                        "product_id": str(item.id),
                        "size": item.size or "",
                    },
                },
                "unit_amount": int(price * 100),
            },
            "quantity": qty,
        })

    promo = None
    promo_discount = 0.0
    promo_type = None
    normalized_promo_code = normalize_promo_code(payload.promo_code)
    if normalized_promo_code:
        promo = get_active_promo_row(normalized_promo_code)
        if not promo:
            raise HTTPException(status_code=400, detail="Promo code is invalid or expired")
        promo_type = str(promo.get("discount_type") or "").lower()
        promo_discount = promo_discount_amount(subtotal, promo, SHIPPING_COST)
        if promo_discount <= 0:
            raise HTTPException(status_code=400, detail="Promo code does not apply")

    checkout_origin = resolve_checkout_origin(http_request, payload)

    should_charge_shipping = promo_type != "free_shipping"
    if should_charge_shipping:
        line_items.append({
            "price_data": {
                "currency": "eur",
                "product_data": {"name": "Shipping"},
                "unit_amount": int(SHIPPING_COST * 100),
            },
            "quantity": 1,
        })
    amount_total = subtotal - promo_discount + (SHIPPING_COST if should_charge_shipping else 0.0)

    reserve_stock(normalized_items)
    client_reference_id = str(uuid.uuid4())
    created_order = None

    try:
        metadata_json = {"source": "web_checkout"}
        if promo:
            metadata_json["promo_code"] = promo.get("code")
            metadata_json["promo_discount_type"] = promo.get("discount_type")
            metadata_json["promo_discount_value"] = promo.get("discount_value")
            metadata_json["promo_discount_amount"] = promo_discount
        if payload.comment:
            metadata_json["order_note"] = payload.comment[:500]

        order_insert = supabase.table("orders").insert({
            "client_reference_id": client_reference_id,
            "status": ORDER_PENDING,
            "currency": "eur",
            "amount_total": round(amount_total, 2),
            "items_json": normalized_items,
            "metadata_json": metadata_json,
            "email": payload.customer_email,
            "phone": payload.phone,
            "shipping_name": f"{payload.first_name or ''} {payload.last_name or ''}".strip(),
            "shipping_line1": payload.address,
            "shipping_city": payload.city,
            "shipping_postal_code": payload.zip,
            "shipping_country": payload.country,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }).execute()
        if not order_insert.data:
            raise HTTPException(status_code=500, detail="Failed to create order")
        created_order = order_insert.data[0]
        capture_subscriber_email(
            payload.customer_email,
            "checkout_started",
            {"client_reference_id": client_reference_id},
        )

        stripe_discounts = None
        if promo and promo_type in ("percent", "fixed"):
            promo_value = float(promo.get("discount_value") or 0)
            if promo_type == "percent":
                coupon = stripe.Coupon.create(
                    duration="once",
                    percent_off=promo_value,
                    name=f"Promo {promo.get('code')}",
                    metadata={"promo_code": str(promo.get("code") or "")},
                )
                stripe_discounts = [{"coupon": coupon.id}]
            elif promo_type == "fixed":
                coupon = stripe.Coupon.create(
                    duration="once",
                    amount_off=int(round(promo_value * 100)),
                    currency="eur",
                    name=f"Promo {promo.get('code')}",
                    metadata={"promo_code": str(promo.get("code") or "")},
                )
                stripe_discounts = [{"coupon": coupon.id}]

        # For quick checkout (from cart) Stripe collects shipping; for normal
        # checkout the customer already filled it in on our Details page.
        stripe_session_params: dict = dict(
            payment_method_types=["card", "klarna", "paypal"],
            line_items=line_items,
            mode="payment",
            client_reference_id=client_reference_id,
            discounts=stripe_discounts,
            billing_address_collection="required",
            customer_email=payload.customer_email,
            metadata={
                "client_reference_id": client_reference_id,
                "order_id": str(created_order.get("id")),
                "promo_code": str(promo.get("code")) if promo else "",
                **({"order_note": payload.comment[:500]} if payload.comment else {}),
            },
            success_url=f"{checkout_origin}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{checkout_origin}/cart",
        )
        if payload.quick:
            stripe_session_params["shipping_address_collection"] = {
                "allowed_countries": [
                    "US", "CA", "GB", "DE", "FR", "ES", "IT", "NL", "BE", "PL", "PT",
                    "SE", "NO", "DK", "FI", "IE", "AT", "CH", "CZ"
                ]
            }
            stripe_session_params["phone_number_collection"] = {"enabled": True}
        session = stripe.checkout.Session.create(**stripe_session_params)
        session_dict = stripe_obj_to_dict(session)
        expires_at_epoch = session_dict.get("expires_at")
        expires_at_iso = None
        if expires_at_epoch:
            expires_at_iso = datetime.fromtimestamp(expires_at_epoch, tz=timezone.utc).isoformat()

        session_shipping_fields = {
            k: v for k, v in extract_shipping_fields(session_dict).items()
            if first_non_empty(v) is not None
        }
        supabase.table("orders").update({
            "stripe_session_id": session.id,
            "stripe_payment_intent_id": session_dict.get("payment_intent"),
            "stripe_customer_id": session_dict.get("customer"),
            "session_json": session_dict,
            "email": as_dict(session_dict.get("customer_details")).get("email") or payload.customer_email,
            **session_shipping_fields,
            "expires_at": expires_at_iso,
            "updated_at": now_iso(),
        }).eq("id", created_order["id"]).execute()
        return {"url": session.url}

    except HTTPException:
        release_reserved_stock(normalized_items)
        raise
    except Exception as exc:
        release_reserved_stock(normalized_items)
        if created_order:
            supabase.table("orders").update({
                "status": ORDER_PAYMENT_FAILED,
                "failed_at": now_iso(),
                "updated_at": now_iso(),
            }).eq("id", created_order["id"]).execute()
        raise HTTPException(status_code=500, detail=f"Checkout creation failed: {exc}")

def compute_auto_tags(product: dict) -> list:
    tags = list(product.get("tags") or [])
    available = get_available_stock_value(product)
    
    # Убираем авто-теги чтобы пересчитать
    auto_tags = {"low_stock", "sold_out"}
    tags = [t for t in tags if t not in auto_tags]
    
    if available == 0:
        tags.append("sold_out")
    elif available < 5:
        tags.append("low_stock")
    
    return tags

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET is not configured")

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=signature, secret=secret)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}")
    except stripe.error.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid signature: {exc}")

    event_dict = stripe_obj_to_dict(event)
    if not save_webhook_event_once(event_dict):
        return {"received": True, "duplicate": True}

    event_type = event_dict.get("type")
    data_obj = event_dict.get("data", {}).get("object", {})
    stripe_session_id = data_obj.get("id")
    client_reference_id = data_obj.get("client_reference_id")
    order = find_order(client_reference_id, stripe_session_id)

    if not order:
        return {"received": True, "warning": "order_not_found"}

    current_status = order.get("status")
    target_status = None
    if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        target_status = ORDER_PAID
    elif event_type == "checkout.session.async_payment_failed":
        target_status = ORDER_PAYMENT_FAILED
    elif event_type == "checkout.session.expired":
        target_status = ORDER_CANCELLED

    items = order.get("items_json") or []
    changed = False
    if target_status == ORDER_PAID and current_status == ORDER_PENDING:
        finalize_paid_stock(items)
        increment_promo_usage_if_needed(order)
        send_order_confirmation_emails(order)
        changed = True
    elif target_status in (ORDER_PAYMENT_FAILED, ORDER_CANCELLED) and current_status == ORDER_PENDING:
        release_reserved_stock(items)
        changed = True

    webhook_shipping_fields = {
        k: v for k, v in extract_shipping_fields(data_obj).items()
        if first_non_empty(v) is not None
    }
    update_payload = {
        "updated_at": now_iso(),
        "event_json": event_dict,
        "session_json": data_obj,
        "stripe_session_id": order.get("stripe_session_id") or stripe_session_id,
        "stripe_customer_id": data_obj.get("customer") or order.get("stripe_customer_id"),
        "stripe_payment_intent_id": data_obj.get("payment_intent") or order.get("stripe_payment_intent_id"),
        "email": as_dict(data_obj.get("customer_details")).get("email") or order.get("email"),
        "shipping_json": data_obj.get("shipping_details") or order.get("shipping_json"),
        "customer_json": data_obj.get("customer_details") or order.get("customer_json"),
        "currency": data_obj.get("currency") or order.get("currency"),
        "amount_total": (data_obj.get("amount_total") / 100.0) if data_obj.get("amount_total") else order.get("amount_total"),
        **webhook_shipping_fields,
    }

    if target_status and (changed or current_status != ORDER_PAID):
        update_payload["status"] = target_status
        if target_status == ORDER_PAID:
            update_payload["paid_at"] = now_iso()
        elif target_status == ORDER_PAYMENT_FAILED:
            update_payload["failed_at"] = now_iso()
        elif target_status == ORDER_CANCELLED:
            update_payload["cancelled_at"] = now_iso()

    supabase.table("orders").update(update_payload).eq("id", order["id"]).execute()

    # Record purchase event for marketing tracking
    if target_status == ORDER_PAID:
        order_email = update_payload.get("email") or order.get("email")
        record_user_event(
            session_id=order.get("client_reference_id") or "webhook",
            event_type="purchase",
            email=order_email,
            order_id=order.get("id"),
            metadata={
                "amount_total": float(update_payload.get("amount_total") or order.get("amount_total") or 0),
                "items_count": len(order.get("items_json") or []),
            },
        )

    capture_subscriber_email(
        update_payload.get("email") or order.get("email"),
        "order_webhook",
        {
            "order_id": order.get("id"),
            "status": update_payload.get("status") or order.get("status"),
        },
    )
    return {"received": True}


@app.get("/orders")
def list_orders():
    data = supabase.table("orders").select("*").order("created_at", desc=True).limit(100).execute()
    return data.data


@app.get("/orders/track")
def track_orders(email: str):
    normalized = str(email or "").strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail="email is required")
    data = (
        supabase.table("orders")
        .select("*")
        .ilike("email", normalized)
        .neq("status", "payment_failed")
        .neq("status", "cancelled")
        .order("created_at", desc=False)
        .limit(200)
        .execute()
    )
    items = [enrich_order_shipping(row) for row in (data.data or [])]
    numbered = [{**row, "user_order_number": idx + 1} for idx, row in enumerate(items)]
    return list(reversed(numbered))


@app.get("/orders/track/{order_id}")
def track_order_details(order_id: int, email: str):
    normalized = str(email or "").strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail="email is required")
    data = (
        supabase.table("orders")
        .select("*")
        .ilike("email", normalized)
        .neq("status", "payment_failed")
        .neq("status", "cancelled")
        .order("created_at", desc=False)
        .limit(200)
        .execute()
    )
    items = [enrich_order_shipping(row) for row in (data.data or [])]
    for idx, row in enumerate(items, start=1):
        if int(row.get("id") or 0) == order_id:
            return {**row, "user_order_number": idx}
    raise HTTPException(status_code=404, detail="Order not found")


@app.get("/orders/{id_or_session}")
def get_order(id_or_session: str):
    result = supabase.table("orders").select("*").eq("stripe_session_id", id_or_session).limit(1).execute()
    if result.data:
        return enrich_order_shipping(result.data[0])

    result = supabase.table("orders").select("*").eq("client_reference_id", id_or_session).limit(1).execute()
    if result.data:
        return enrich_order_shipping(result.data[0])

    if id_or_session.isdigit():
        result = supabase.table("orders").select("*").eq("id", int(id_or_session)).limit(1).execute()
        if result.data:
            return enrich_order_shipping(result.data[0])

    raise HTTPException(status_code=404, detail="Order not found")


# ── Admin order management ────────────────────────────────────────────────────

VALID_ORDER_STATUSES = {"pending", "paid", "shipped", "delivered", "cancelled", "payment_failed"}


class OrderUpdatePayload(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None


@app.patch("/orders/{order_id}")
def update_order_admin(order_id: int, payload: OrderUpdatePayload):
    updates: dict = {"updated_at": now_iso()}
    if payload.status is not None:
        if payload.status not in VALID_ORDER_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {', '.join(sorted(VALID_ORDER_STATUSES))}")
        updates["status"] = payload.status
        if payload.status == "shipped":
            # Only set shipped_at once
            row = supabase.table("orders").select("shipped_at").eq("id", order_id).limit(1).execute()
            if row.data and not row.data[0].get("shipped_at"):
                updates["shipped_at"] = now_iso()
    if payload.tracking_number is not None:
        updates["tracking_number"] = payload.tracking_number or None
    if payload.tracking_url is not None:
        updates["tracking_url"] = payload.tracking_url or None

    result = supabase.table("orders").update(updates).eq("id", order_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return enrich_order_shipping(result.data[0])


@app.delete("/orders/{order_id}")
def delete_order_admin(order_id: int):
    supabase.table("orders").delete().eq("id", order_id).execute()
    return {"ok": True}


def build_shipping_notification_email(order: dict) -> tuple[str, str]:
    """Returns (html, text) for the shipping notification email."""
    first_name = (str(order.get("shipping_name") or "").split() or ["there"])[0]
    order_id_val = order.get("id", "")
    tracking_number = str(order.get("tracking_number") or "").strip()
    tracking_url = str(order.get("tracking_url") or "").strip()
    items = order.get("items_json") or []
    items_html_str = order_items_html(items)
    items_text_str = order_items_text(items)
    total = to_float(order.get("amount_total"))
    store_url = FRONTEND_URL.rstrip("/")

    tracking_block_html = ""
    tracking_block_text = ""
    if tracking_number or tracking_url:
        track_rows = ""
        if tracking_number:
            track_rows += f"<p style='margin:4px 0;font-size:14px;color:#1a1a18'>Tracking number: <strong>{tracking_number}</strong></p>"
        if tracking_url:
            track_rows += f"<p style='margin:4px 0;font-size:14px'><a href='{tracking_url}' style='color:#2563eb;font-weight:600'>Track your package →</a></p>"
        tracking_block_html = f"""
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:20px 0">
          <p style="margin:0 0 8px;font-weight:700;font-size:15px;color:#166534">📦 Tracking information</p>
          {track_rows}
        </div>"""
        tracking_block_text = (
            f"\nTracking number: {tracking_number}\n" if tracking_number else ""
        ) + (f"Track here: {tracking_url}\n" if tracking_url else "")

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8e8e4">
  <div style="background:#111;padding:24px 32px">
    <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.06em;color:#fff">edm.clothes</p>
  </div>
  <div style="padding:32px">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#1a1a18">Your order is on the way! 🚀</h1>
    <p style="font-size:15px;color:#555;margin:0 0 20px">Hi {first_name}, great news — your order #{order_id_val} has been shipped.</p>
    {tracking_block_html}
    <h2 style="font-size:14px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin:24px 0 12px">Order summary</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="border-bottom:2px solid #f0f0ee">
          <th style="padding:6px 0;text-align:left;color:#888;font-weight:500">Item</th>
          <th style="padding:6px 0;text-align:center;color:#888;font-weight:500">Qty</th>
          <th style="padding:6px 0;text-align:right;color:#888;font-weight:500">Price</th>
        </tr>
      </thead>
      <tbody>{items_html_str}</tbody>
    </table>
    <p style="margin:16px 0 0;font-size:15px;font-weight:700;text-align:right">Total: {money_eur(total)}</p>
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #f0f0ee;text-align:center">
      <p style="font-size:13px;color:#888;margin:0">Questions? Reply to this email or visit <a href="{store_url}" style="color:#111">{store_url.replace("https://","")}</a></p>
    </div>
  </div>
</div>
</body></html>"""

    text = f"""Your order #{order_id_val} has been shipped!

Hi {first_name}, your edm.clothes order is on its way.
{tracking_block_text}
Order summary:
{items_text_str}

Total: {money_eur(total)}

Questions? Contact us at {store_url}
"""
    return html, text


@app.post("/orders/{order_id}/notify-shipped")
def notify_order_shipped(order_id: int):
    result = supabase.table("orders").select("*").eq("id", order_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = enrich_order_shipping(result.data[0])
    customer_email = str(order.get("email") or "").strip()
    if not customer_email:
        raise HTTPException(status_code=400, detail="Order has no customer email")
    html, text = build_shipping_notification_email(order)
    send_email(customer_email, f"Your order #{order_id} has been shipped! 🚀", html, text)
    supabase.table("orders").update({"shipped_at": now_iso(), "updated_at": now_iso()}).eq("id", order_id).execute()
    return {"ok": True}


@app.post("/email-subscribers/capture")
def capture_email_subscriber(payload: SubscriberCaptureRequest):
    email = normalize_email(payload.email)
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    capture_subscriber_email(email, payload.source or "unknown", payload.metadata or {})
    promo_code = get_setting("popup_promo_code", "WELCOME10")
    return {"ok": True, "promo_code": promo_code}


@app.get("/settings")
def get_all_settings():
    data = supabase.table("settings").select("key,value").execute()
    return {row["key"]: row.get("value", "") for row in (data.data or [])}


@app.put("/settings")
def update_settings(payload: dict):
    for key, value in payload.items():
        supabase.table("settings").upsert(
            {"key": key, "value": str(value), "updated_at": now_iso()},
            on_conflict="key"
        ).execute()
    return {"ok": True}


# ── Homepage slides ─────────────────────────────────────────────────────────

class HomepageSlide(BaseModel):
    image_url: str
    href: str = '/products'
    title: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

class HomepageSlideUpdate(BaseModel):
    image_url: Optional[str] = None
    href: Optional[str] = None
    title: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class HomepageSlidesReorder(BaseModel):
    ids: list[int]  # ordered list of slide ids

@app.get("/homepage-slides")
def get_homepage_slides():
    """Public: active slides ordered by sort_order."""
    data = supabase.table("homepage_slides").select("*").eq("is_active", True).order("sort_order").execute()
    return data.data or []

@app.get("/homepage-slides/admin")
def get_homepage_slides_admin():
    """Admin: all slides."""
    data = supabase.table("homepage_slides").select("*").order("sort_order").execute()
    return data.data or []

@app.post("/homepage-slides/upload")
async def upload_and_create_homepage_slide(
    file: UploadFile = File(...),
    href: str = Form("/products"),
    title: str = Form(""),
):
    """Upload a photo and create a slide in one shot."""
    ext = (file.filename or "jpg").rsplit(".", 1)[-1].lower()
    path = f"homepage/{uuid.uuid4()}.{ext}"
    content = await file.read()
    supabase.storage.from_("product-images").upload(path, content, {"content-type": file.content_type})
    url = supabase.storage.from_("product-images").get_public_url(path)
    existing = supabase.table("homepage_slides").select("sort_order").order("sort_order", desc=True).limit(1).execute()
    next_order = (existing.data[0]["sort_order"] + 1) if existing.data else 0
    slide_data = {"image_url": url, "href": href or "/products", "title": title or None, "sort_order": next_order, "is_active": True}
    data = supabase.table("homepage_slides").insert(slide_data).execute()
    if not data.data:
        raise HTTPException(status_code=500, detail="Failed to create slide")
    return data.data[0]

@app.post("/homepage-slides")
def create_homepage_slide(slide: HomepageSlide):
    data = supabase.table("homepage_slides").insert(slide.dict()).execute()
    if not data.data:
        raise HTTPException(status_code=500, detail="Failed to create slide")
    return data.data[0]

@app.put("/homepage-slides/reorder")
def reorder_homepage_slides(payload: HomepageSlidesReorder):
    for order, slide_id in enumerate(payload.ids):
        supabase.table("homepage_slides").update({"sort_order": order}).eq("id", slide_id).execute()
    return {"ok": True}

@app.put("/homepage-slides/{slide_id}")
def update_homepage_slide(slide_id: int, slide: HomepageSlideUpdate):
    updates = {k: v for k, v in slide.dict().items() if v is not None}
    data = supabase.table("homepage_slides").update(updates).eq("id", slide_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Slide not found")
    return data.data[0]

@app.delete("/homepage-slides/{slide_id}")
def delete_homepage_slide(slide_id: int):
    supabase.table("homepage_slides").delete().eq("id", slide_id).execute()
    return {"ok": True}


@app.get("/email-subscribers")
def list_email_subscribers(limit: int = 500, all: bool = False):
    safe_limit = max(1, min(int(limit or 500), 5000))
    query = supabase.table("email_subscribers").select("*")
    if not all:
        query = query.eq("is_active", True)
    data = query.order("last_seen_at", desc=True).limit(safe_limit).execute()
    return data.data or []


@app.get("/email-subscribers/export.csv")
def export_email_subscribers_csv():
    data = (
        supabase.table("email_subscribers")
        .select("*")
        .order("last_seen_at", desc=True)
        .limit(20000)
        .execute()
    )
    rows = data.data or []
    header = "email,first_source,last_source,events_count,first_seen_at,last_seen_at\n"
    lines = [header]
    for row in rows:
        email = str(row.get("email") or "").replace('"', '""')
        first_source = str(row.get("first_source") or "").replace('"', '""')
        last_source = str(row.get("last_source") or "").replace('"', '""')
        events_count = int(row.get("events_count") or 0)
        first_seen_at = str(row.get("first_seen_at") or "").replace('"', '""')
        last_seen_at = str(row.get("last_seen_at") or "").replace('"', '""')
        lines.append(
            f"\"{email}\",\"{first_source}\",\"{last_source}\",{events_count},\"{first_seen_at}\",\"{last_seen_at}\"\n"
        )
    return Response(
        content="".join(lines),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=email_subscribers.csv"},
    )


# ── Newsletter subscription status / toggle ──────────────────────────────────

@app.get("/email-subscribers/status")
def get_subscriber_status(email: str):
    email = normalize_email(email)
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    result = (
        supabase.table("email_subscribers")
        .select("is_active")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    if result.data:
        row = result.data[0]
        # If is_active is NULL (column added later), treat existing row as subscribed
        is_active = row.get("is_active")
        return {"subscribed": is_active is not False}
    return {"subscribed": False}


@app.post("/email-subscribers/unsubscribe")
def unsubscribe_email(payload: dict):
    email = normalize_email(str(payload.get("email") or ""))
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    supabase.table("email_subscribers").update({"is_active": False}).eq("email", email).execute()
    return {"ok": True}


# ── User profile (shipping details) ──────────────────────────────────────────

class UserProfileUpdate(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None


@app.get("/user-profile")
def get_user_profile(email: str):
    email = normalize_email(email)
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    result = (
        supabase.table("user_profiles")
        .select("*")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return {}


@app.put("/user-profile")
def update_user_profile(payload: UserProfileUpdate):
    email = normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    data = {k: v for k, v in payload.dict().items() if k != "email" and v is not None}
    data["updated_at"] = now_iso()
    result = (
        supabase.table("user_profiles")
        .upsert({"email": email, **data}, on_conflict="email")
        .execute()
    )
    return result.data[0] if result.data else {"ok": True}


# ── User events (marketing/ML tracking) ──────────────────────────────────────

ALLOWED_EVENT_TYPES = {
    "product_view", "cart_add", "checkout_started",
    "purchase", "login", "wishlist_add",
}

class UserEventPayload(BaseModel):
    session_id: str
    event_type: str
    email: Optional[str] = None
    product_id: Optional[int] = None
    order_id: Optional[int] = None
    metadata: Optional[dict] = None


def record_user_event(
    session_id: str,
    event_type: str,
    email: Optional[str] = None,
    product_id: Optional[int] = None,
    order_id: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> None:
    """Insert a user_events row and update user_profiles aggregates."""
    now = now_iso()
    email_norm = normalize_email(email) if email else None
    try:
        supabase.table("user_events").insert({
            "session_id": session_id,
            "event_type": event_type,
            "email": email_norm or None,
            "product_id": product_id,
            "order_id": order_id,
            "metadata": metadata or {},
            "created_at": now,
        }).execute()
    except Exception:
        pass  # never block the main flow

    if not email_norm:
        return

    # Update user_profiles aggregates
    try:
        profile = (
            supabase.table("user_profiles")
            .select("id,total_events,total_orders,total_spent,last_login_at,last_purchase_at")
            .eq("email", email_norm)
            .limit(1)
            .execute()
        )
        row = profile.data[0] if profile.data else None
        updates: dict = {
            "email": email_norm,
            "updated_at": now,
            "total_events": int((row or {}).get("total_events") or 0) + 1,
        }
        if event_type == "login":
            updates["last_login_at"] = now
        if event_type == "purchase":
            updates["last_purchase_at"] = now
            updates["total_orders"] = int((row or {}).get("total_orders") or 0) + 1
            updates["total_spent"] = float((row or {}).get("total_spent") or 0) + float(
                (metadata or {}).get("amount_total", 0)
            )
        supabase.table("user_profiles").upsert(updates, on_conflict="email").execute()
    except Exception:
        pass


@app.post("/events")
def track_event(payload: UserEventPayload):
    if payload.event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown event_type: {payload.event_type}")
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    record_user_event(
        session_id=payload.session_id,
        event_type=payload.event_type,
        email=payload.email,
        product_id=payload.product_id,
        order_id=payload.order_id,
        metadata=payload.metadata,
    )
    return {"ok": True}