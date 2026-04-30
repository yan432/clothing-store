from datetime import datetime, timezone, timedelta
import html as _html
import json
import math as _math
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
from fastapi import BackgroundTasks, Body, Depends, FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile
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

# Use service role key if available (bypasses RLS — backend is trusted server).
# Falls back to anon key for local dev without RLS configured.
_supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase: Client = create_client(os.getenv("SUPABASE_URL"), _supabase_key)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

ORDER_PENDING = "pending"
ORDER_PAID = "paid"
ORDER_PAYMENT_FAILED = "payment_failed"
ORDER_CANCELLED = "cancelled"
RESEND_API_URL = "https://api.resend.com/emails"
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Store <onboarding@resend.dev>")
RESEND_WEBHOOK_SECRET = os.getenv("RESEND_WEBHOOK_SECRET", "")
ORDER_ALERT_EMAIL = os.getenv("ORDER_ALERT_EMAIL")

# ── Admin auth ────────────────────────────────────────────────────────────────
# Set ADMIN_SECRET to a long random string in your backend .env.
# The Next.js proxy reads the same value as BACKEND_ADMIN_SECRET and forwards
# it in X-Admin-Secret for every request coming from an authenticated admin session.
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")

def require_admin(request: Request):
    """FastAPI dependency: reject non-admin requests."""
    if not ADMIN_SECRET:
        # In production this must be set — log a loud warning so it's never missed
        import sys
        print("WARNING: ADMIN_SECRET is not set — all admin endpoints are OPEN. Set it in your environment!", file=sys.stderr, flush=True)
        return
    header = request.headers.get("X-Admin-Secret", "")
    if header != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

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
    volumetric_weight: Optional[float] = None  # kg — used for shipping calculation


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
    volumetric_weight: Optional[float] = None  # kg — used for shipping calculation


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
    utm: Optional[dict] = None  # { utm_source, utm_medium, utm_campaign, utm_content, utm_term }


class PromoCodeCreate(BaseModel):
    code: Optional[str] = None
    discount_type: str
    discount_value: Optional[float] = None
    expires_at: Optional[str] = None
    usage_limit: Optional[int] = None
    one_per_email: Optional[bool] = False


class PromoCodeUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    expires_at: Optional[str] = None
    usage_limit: Optional[int] = None
    is_active: Optional[bool] = None
    one_per_email: Optional[bool] = None


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
    # Atomic increment via SQL expression to avoid read-modify-write race conditions
    try:
        supabase.rpc("increment_promo_used_count", {"promo_id": promo["id"]}).execute()
    except Exception:
        # Fallback: plain read-modify-write (safe for low-traffic stores)
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
    display_name = from_name or "EDM Clothes"
    try:
        display_name = from_name or get_setting("email_from_name", "EDM Clothes")
    except Exception:
        pass

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{display_name} <{ZOHO_SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    # Try SSL on port 465 first (cloud hosts often block 587/STARTTLS)
    try:
        with smtplib.SMTP_SSL(ZOHO_SMTP_HOST, 465, timeout=8) as server:
            server.login(ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD)
            server.sendmail(ZOHO_SMTP_USER, to_email, msg.as_string())
        print(f"Zoho SMTP SSL(465): sent to={to_email!r}")
        return True
    except Exception as exc_ssl:
        print(f"Zoho SMTP SSL(465) failed: {exc_ssl} — trying STARTTLS({ZOHO_SMTP_PORT})")

    # Fallback: STARTTLS on configured port (default 587)
    try:
        with smtplib.SMTP(ZOHO_SMTP_HOST, ZOHO_SMTP_PORT, timeout=8) as server:
            server.ehlo()
            server.starttls()
            server.login(ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD)
            server.sendmail(ZOHO_SMTP_USER, to_email, msg.as_string())
        print(f"Zoho SMTP STARTTLS({ZOHO_SMTP_PORT}): sent to={to_email!r}")
        return True
    except Exception as exc_tls:
        print(f"Zoho SMTP STARTTLS({ZOHO_SMTP_PORT}) failed: {exc_tls}")
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
        print(f"send_email: skipped — empty recipient (subject={subject!r})")
        return
    print(f"send_email: sending to={target!r} subject={subject!r}")
    if send_email_zoho(target, subject, html, text):
        print(f"send_email: sent via Zoho SMTP to={target!r}")
        return
    send_resend_email(target, subject, html, text)


def send_email_sync_debug(to_email: str, subject: str, html: str, text: str) -> dict:
    """Like send_email but returns a debug dict instead of raising — used by test endpoint."""
    target = str(to_email or "").strip()
    result: dict = {"to": target, "subject": subject, "zoho_ok": False, "resend_ok": False,
                    "zoho_error": None, "resend_error": None}
    if not target:
        result["error"] = "Empty recipient"
        return result
    # Try Zoho
    if ZOHO_SMTP_USER and ZOHO_SMTP_PASSWORD:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"EDM Clothes <{ZOHO_SMTP_USER}>"
        msg["To"] = target
        msg["Subject"] = subject
        msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))
        raw = msg.as_string()
        # Try SSL 465
        try:
            with smtplib.SMTP_SSL(ZOHO_SMTP_HOST, 465, timeout=15) as srv:
                srv.login(ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD)
                srv.sendmail(ZOHO_SMTP_USER, target, raw)
            result["zoho_ok"] = True
            result["zoho_method"] = "SSL:465"
            return result
        except Exception as exc_ssl:
            result["zoho_ssl_error"] = str(exc_ssl)
        # Try STARTTLS 587
        try:
            with smtplib.SMTP(ZOHO_SMTP_HOST, ZOHO_SMTP_PORT, timeout=15) as srv:
                srv.ehlo(); srv.starttls()
                srv.login(ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD)
                srv.sendmail(ZOHO_SMTP_USER, target, raw)
            result["zoho_ok"] = True
            result["zoho_method"] = f"STARTTLS:{ZOHO_SMTP_PORT}"
            return result
        except Exception as exc_tls:
            result["zoho_error"] = str(exc_tls)
    else:
        result["zoho_error"] = "ZOHO_SMTP_USER or ZOHO_SMTP_PASSWORD not set"
    # Try Resend
    if RESEND_API_KEY:
        sender = str(RESEND_FROM_EMAIL or "").strip() or "Store <onboarding@resend.dev>"
        try:
            resp = requests.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": sender, "to": [target], "subject": subject, "html": html, "text": text},
                timeout=8,
            )
            if resp.status_code < 400:
                result["resend_ok"] = True
            else:
                result["resend_error"] = f"HTTP {resp.status_code}: {resp.text[:300]}"
        except Exception as exc:
            result["resend_error"] = str(exc)
    else:
        result["resend_error"] = "RESEND_API_KEY not set"
    return result


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
    order_id = 10000 + int(order.get("id") or 0)  # human-readable order number
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

    _db_admin_email = get_setting("admin_email", "")
    admin_target = (
        str(ORDER_ALERT_EMAIL or "").strip()
        or str(_db_admin_email or "").strip()
        or "sales@edmclothes.net"
    )
    if admin_target:
        admin_subj_tpl = cfg.get("email_admin_subject") or "New order #{order_id} — {total}"
        admin_subject = fmt(admin_subj_tpl)
        # Carrier info from metadata
        shipping_carrier = str(metadata.get("shipping_carrier") or "").strip()
        shipping_label = str(metadata.get("shipping_label") or "").strip()
        shipping_weight = metadata.get("shipping_weight_kg")
        carrier_display = {
            "nova_poshta": "Nova Poshta",
            "ukrposhta": "Ukr Poshta",
        }.get(shipping_carrier, shipping_carrier or "—")
        carrier_row_html = (
            f"<p><strong>Carrier:</strong> {carrier_display}"
            + (f" ({shipping_label})" if shipping_label else "")
            + (f" &nbsp;·&nbsp; Weight: {shipping_weight} kg" if shipping_weight else "")
            + "</p>"
        )
        carrier_row_text = (
            f"Carrier: {carrier_display}"
            + (f" ({shipping_label})" if shipping_label else "")
            + (f" | Weight: {shipping_weight} kg" if shipping_weight else "")
        )
        admin_html = f"""
          <div style="font-family:Arial,sans-serif;color:#111">
            <h2>New paid order received</h2>
            <p><strong>Order #{order_id}</strong> · Ref: {order_ref or '-'}</p>
            <p><strong>Customer:</strong> {customer_email or '-'}</p>
            <p><strong>Shipping address:</strong> {shipping_address or 'Not provided'}</p>
            {carrier_row_html}
            <table style="width:100%;border-collapse:collapse">
              <thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Total</th></tr></thead>
              <tbody>{items_html}</tbody>
            </table>
            <hr/>
            <p>Subtotal: {money_eur(subtotal)} &nbsp;·&nbsp; Shipping: {money_eur(shipping)} &nbsp;·&nbsp; <strong>Total: {money_eur(total)}</strong></p>
          </div>
        """
        admin_text = (
            f"New order #{order_id}\nCustomer: {customer_email}\n"
            f"Shipping address: {shipping_address or '-'}\n"
            f"{carrier_row_text}\n\n"
            f"{items_text}\n\n"
            f"Subtotal: {money_eur(subtotal)} | Shipping: {money_eur(shipping)} | Total: {money_eur(total)}"
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
    """Reserve stock for a checkout. Uses atomic PostgreSQL RPCs to prevent race
    conditions. Falls back to non-atomic updates if RPCs are not installed yet."""
    # ── product-level ─────────────────────────────────────────────────────────
    quantities_by_product: dict[int, int] = {}
    for item in items:
        product_id = int(item["id"])
        qty = max(0, int(item["quantity"]))
        quantities_by_product[product_id] = quantities_by_product.get(product_id, 0) + qty

    # Pre-validate stock (fast read before atomic ops)
    products_map: dict[int, dict] = {}
    for product_id, qty in quantities_by_product.items():
        product = get_product_row(product_id)
        available = get_available_stock_value(product)
        if available < qty:
            name = product.get("name") or f"Product {product_id}"
            raise HTTPException(status_code=400, detail=f"Not enough stock for {name}")
        products_map[product_id] = product

    # Atomic reserve via PostgreSQL function (prevents race conditions)
    rpc_available = True
    reserved_product_ids: list[int] = []
    try:
        for product_id, qty in quantities_by_product.items():
            result = supabase.rpc("reserve_product_stock", {"p_id": product_id, "p_qty": qty}).execute()
            if not result.data:
                # Concurrent checkout claimed the last unit — roll back what we reserved
                for done_id in reserved_product_ids:
                    done_qty = quantities_by_product[done_id]
                    try:
                        p = get_product_row(done_id)
                        av = get_available_stock_value(p)
                        rv = get_reserved_stock_value(p)
                        supabase.table("products").update({
                            "available_stock": av + done_qty,
                            "reserved_stock": max(0, rv - done_qty),
                            "stock": av + done_qty,
                        }).eq("id", done_id).execute()
                    except Exception:
                        pass
                name = products_map.get(product_id, {}).get("name") or f"Product {product_id}"
                raise HTTPException(status_code=400, detail=f"Not enough stock for {name} (concurrent checkout)")
            reserved_product_ids.append(product_id)
    except HTTPException:
        raise
    except Exception:
        # RPC not installed yet — fall back to non-atomic update (run migration 016)
        rpc_available = False
        for product_id, qty in quantities_by_product.items():
            product = products_map[product_id]
            available = get_available_stock_value(product)
            reserved = get_reserved_stock_value(product)
            supabase.table("products").update({
                "available_stock": available - qty,
                "reserved_stock": reserved + qty,
                "stock": available - qty,
            }).eq("id", product_id).execute()

    # ── size-level ────────────────────────────────────────────────────────────
    quantities_by_size: dict[tuple[int, str], int] = {}
    for item in items:
        size = str(item.get("size") or "").strip()
        if not size:
            continue
        key = (int(item["id"]), size)
        qty = max(0, int(item["quantity"]))
        quantities_by_size[key] = quantities_by_size.get(key, 0) + qty

    if not quantities_by_size:
        return
    try:
        for (product_id, size), qty in quantities_by_size.items():
            if rpc_available:
                supabase.rpc("reserve_size_stock", {
                    "p_product_id": product_id, "p_size": size, "p_qty": qty,
                }).execute()
            else:
                row = supabase.table("product_size_stock").select("reserved").eq("product_id", product_id).eq("size", size).limit(1).execute()
                if not row.data:
                    continue
                current_reserved = int(row.data[0].get("reserved", 0) or 0)
                supabase.table("product_size_stock").update({
                    "reserved": current_reserved + qty,
                }).eq("product_id", product_id).eq("size", size).execute()
    except Exception:
        pass  # size-level tracking is optional — never block checkout


def release_reserved_stock(items: list[dict]) -> None:
    # ── product-level ─────────────────────────────────────────────────────────
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

    # ── size-level ────────────────────────────────────────────────────────────
    quantities_by_size: dict[tuple[int, str], int] = {}
    for item in items:
        size = str(item.get("size") or "").strip()
        if not size:
            continue
        key = (int(item["id"]), size)
        qty = max(0, int(item["quantity"]))
        quantities_by_size[key] = quantities_by_size.get(key, 0) + qty

    if not quantities_by_size:
        return
    try:
        for (product_id, size), qty in quantities_by_size.items():
            row = supabase.table("product_size_stock").select("reserved").eq("product_id", product_id).eq("size", size).limit(1).execute()
            if not row.data:
                continue
            current_reserved = int(row.data[0].get("reserved", 0) or 0)
            supabase.table("product_size_stock").update({
                "reserved": max(0, current_reserved - qty),
            }).eq("product_id", product_id).eq("size", size).execute()
    except Exception:
        pass


def finalize_paid_stock(items: list[dict]) -> None:
    # ── product-level ─────────────────────────────────────────────────────────
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

    # ── size-level ────────────────────────────────────────────────────────────
    quantities_by_size: dict[tuple[int, str], int] = {}
    for item in items:
        size = str(item.get("size") or "").strip()
        if not size:
            continue
        key = (int(item["id"]), size)
        qty = max(0, int(item["quantity"]))
        quantities_by_size[key] = quantities_by_size.get(key, 0) + qty

    if not quantities_by_size:
        return
    try:
        affected_products: set[int] = set()
        for (product_id, size), qty in quantities_by_size.items():
            row = supabase.table("product_size_stock").select("stock,reserved").eq("product_id", product_id).eq("size", size).limit(1).execute()
            if not row.data:
                continue
            current_stock    = int(row.data[0].get("stock",    0) or 0)
            current_reserved = int(row.data[0].get("reserved", 0) or 0)
            supabase.table("product_size_stock").update({
                "stock":    max(0, current_stock    - qty),
                "reserved": max(0, current_reserved - qty),
            }).eq("product_id", product_id).eq("size", size).execute()
            affected_products.add(product_id)
        # Re-sync products.available_stock from sum of size stocks
        for product_id in affected_products:
            size_data = supabase.table("product_size_stock").select("stock").eq("product_id", product_id).execute()
            total_stock = sum(int(r.get("stock", 0) or 0) for r in (size_data.data or []))
            supabase.table("products").update({"available_stock": total_stock, "stock": total_stock}).eq("id", product_id).execute()
    except Exception:
        pass


def restore_sold_stock(items: list[dict]) -> None:
    """Restore stock for orders that were already paid/finalized (reserved_stock
    already cleared). Called when admin cancels a paid/shipped/delivered order."""
    # ── product-level ─────────────────────────────────────────────────────────
    quantities_by_product: dict[int, int] = {}
    for item in items:
        product_id = int(item.get("id") or item.get("product_id") or 0)
        qty = max(0, int(item.get("quantity") or 0))
        if product_id and qty:
            quantities_by_product[product_id] = quantities_by_product.get(product_id, 0) + qty

    for product_id, qty in quantities_by_product.items():
        try:
            product = get_product_row(product_id)
            available = get_available_stock_value(product)
            supabase.table("products").update({
                "available_stock": available + qty,
                "stock": available + qty,
            }).eq("id", product_id).execute()
        except Exception as exc:
            print(f"restore_sold_stock product {product_id}: {exc}")

    # ── size-level ────────────────────────────────────────────────────────────
    quantities_by_size: dict[tuple[int, str], int] = {}
    for item in items:
        size = str(item.get("size") or "").strip()
        product_id = int(item.get("id") or item.get("product_id") or 0)
        qty = max(0, int(item.get("quantity") or 0))
        if size and product_id and qty:
            key = (product_id, size)
            quantities_by_size[key] = quantities_by_size.get(key, 0) + qty

    if not quantities_by_size:
        return
    try:
        affected_products: set[int] = set()
        for (product_id, size), qty in quantities_by_size.items():
            row = supabase.table("product_size_stock").select("stock").eq("product_id", product_id).eq("size", size).limit(1).execute()
            if not row.data:
                continue
            current_stock = int(row.data[0].get("stock", 0) or 0)
            supabase.table("product_size_stock").update({
                "stock": current_stock + qty,
            }).eq("product_id", product_id).eq("size", size).execute()
            affected_products.add(product_id)
        # Re-sync products.available_stock from size totals
        for pid in affected_products:
            size_data = supabase.table("product_size_stock").select("stock,reserved").eq("product_id", pid).execute()
            total = sum(
                max(0, int(r.get("stock", 0) or 0) - int(r.get("reserved", 0) or 0))
                for r in (size_data.data or [])
            )
            supabase.table("products").update({"available_stock": total, "stock": total}).eq("id", pid).execute()
    except Exception as exc:
        print(f"restore_sold_stock size-level: {exc}")


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


@app.get("/categories")
def get_categories():
    """Return distinct non-empty categories from visible products, sorted alphabetically."""
    data = supabase.table("products").select("category").eq("is_hidden", False).execute()
    cats = sorted({
        p["category"].strip()
        for p in (data.data or [])
        if p.get("category") and p["category"].strip()
    })
    return cats


@app.get("/products/admin", dependencies=[Depends(require_admin)])
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


@app.get("/products/admin/{product_id}", dependencies=[Depends(require_admin)])
def get_product_admin(product_id: int):
    return _decorate_product_with_images(get_product_row(product_id))


@app.post("/products", dependencies=[Depends(require_admin)])
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


@app.put("/products/{product_id}", dependencies=[Depends(require_admin)])
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


@app.delete("/products/{product_id}", dependencies=[Depends(require_admin)])
def delete_product(product_id: int):
    supabase.table("products").delete().eq("id", product_id).execute()
    return {"message": "Удалён"}


@app.post("/products/{product_id}/duplicate", dependencies=[Depends(require_admin)])
def duplicate_product(product_id: int):
    """Create an identical copy of a product (hidden draft, new slug, no images)."""
    original = get_product_row(product_id)
    # Explicit allowlist — only known insertable columns are copied.
    # Using a denylist on select("*") is fragile because Supabase may return
    # generated/computed columns that are rejected on INSERT.
    copy_fields = [
        "description", "material_care", "product_details", "fit_info", "faq",
        "price", "compare_price", "category",
        "tags", "color_name", "color_hex", "color_group_id",
        "volumetric_weight",
    ]
    base_name = str(original.get("name") or "Product")
    payload: dict = {}
    for field in copy_fields:
        val = original.get(field)
        if val is not None:
            payload[field] = val
    payload["name"]            = f"{base_name} (copy)"
    payload["slug"]            = _unique_slug(_make_slug(payload["name"]))
    payload["is_hidden"]       = True   # always start as draft
    payload["stock"]           = 0
    payload["available_stock"] = 0
    payload["reserved_stock"]  = 0
    payload["image_url"]       = None
    payload["image_urls"]      = []
    try:
        data = supabase.table("products").insert(payload).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Duplicate failed: {e}")
    if not data.data:
        raise HTTPException(status_code=500, detail="Duplicate failed")
    return data.data[0]


@app.post("/products/{product_id}/archive", dependencies=[Depends(require_admin)])
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


# ── Per-size stock ────────────────────────────────────────────────────────────

@app.get("/products/{product_id}/size-stock")
def get_product_size_stock(product_id: int):
    """Returns {size: available_stock} map (stock - reserved). Missing sizes = not tracked."""
    try:
        data = supabase.table("product_size_stock").select("size,stock,reserved").eq("product_id", product_id).execute()
        result = {}
        for row in (data.data or []):
            stock    = int(row.get("stock",    0) or 0)
            reserved = int(row.get("reserved", 0) or 0)
            result[row["size"]] = max(0, stock - reserved)
        return result
    except Exception:
        # Fallback: reserved column may not exist yet — return raw stock
        try:
            data = supabase.table("product_size_stock").select("size,stock").eq("product_id", product_id).execute()
            return {row["size"]: max(0, int(row.get("stock", 0) or 0)) for row in (data.data or [])}
        except Exception:
            return {}

@app.put("/products/{product_id}/size-stock", dependencies=[Depends(require_admin)])
def update_product_size_stock(product_id: int, stock_map: dict):
    """Upsert size stock for a product. stock_map = {size: stock_int}."""
    for size, stock in stock_map.items():
        supabase.table("product_size_stock").upsert(
            {"product_id": product_id, "size": str(size), "stock": max(0, int(stock or 0))},
            on_conflict="product_id,size"
        ).execute()
    return {"ok": True}

@app.get("/admin/inventory", dependencies=[Depends(require_admin)])
def get_inventory():
    """All visible products with their per-size stock for CMS."""
    products = supabase.table("products").select("id,name,slug,tags").eq("is_hidden", False).neq("category", "archived").order("name").execute()
    try:
        size_stocks_raw = supabase.table("product_size_stock").select("product_id,size,stock").execute()
    except Exception:
        size_stocks_raw = type("R", (), {"data": []})()  # empty fallback if table missing

    stock_by_product: dict = {}
    for row in (size_stocks_raw.data or []):
        pid = row["product_id"]
        if pid not in stock_by_product:
            stock_by_product[pid] = {}
        stock_by_product[pid][row["size"]] = row["stock"]

    result = []
    for p in (products.data or []):
        result.append({
            "id": p["id"],
            "name": p["name"],
            "slug": p.get("slug") or str(p["id"]),
            "tags": p.get("tags") or [],
            "size_stock": stock_by_product.get(p["id"], {}),
        })
    return result

@app.put("/admin/inventory", dependencies=[Depends(require_admin)])
async def update_inventory(request: Request, bg: BackgroundTasks):
    """Batch upsert: [{product_id, size, stock}]
    Also syncs product-level available_stock = sum of all its sizes
    and triggers back-in-stock waitlist notifications."""
    updates = await request.json()
    if not updates:
        return {"ok": True, "count": 0}

    rows = [
        {"product_id": int(r["product_id"]), "size": str(r["size"]), "stock": max(0, int(r.get("stock") or 0))}
        for r in updates
    ]

    # Snapshot previous stock to detect 0 → positive transitions
    prev_stock: dict[tuple, int] = {}
    affected_products = list({r["product_id"] for r in rows})
    for pid in affected_products:
        existing = supabase.table("product_size_stock").select("size,stock").eq("product_id", pid).execute()
        for row in (existing.data or []):
            prev_stock[(pid, row["size"])] = int(row.get("stock") or 0)

    supabase.table("product_size_stock").upsert(rows, on_conflict="product_id,size").execute()

    # Sync product-level available_stock = sum of all sizes
    for pid in affected_products:
        size_data = supabase.table("product_size_stock").select("stock").eq("product_id", pid).execute()
        total = sum(row["stock"] for row in (size_data.data or []))
        supabase.table("products").update({"available_stock": total, "stock": total}).eq("id", pid).execute()

    # Trigger waitlist notifications for sizes that went from 0 → positive
    for row in rows:
        pid  = row["product_id"]
        size = row["size"]
        new_stock = row["stock"]
        old_stock = prev_stock.get((pid, size), 0)
        if old_stock == 0 and new_stock > 0:
            _notify_waitlist(pid, size, new_stock, bg)

    return {"ok": True, "count": len(rows)}


# ── Waitlist (back-in-stock notifications) ────────────────────────────────────

@app.post("/waitlist")
def join_waitlist(payload: dict = Body(...)):
    """Add an email to the waitlist for a specific product + size."""
    email      = normalize_email(str(payload.get("email") or ""))
    product_id = int(payload.get("product_id") or 0)
    size       = str(payload.get("size") or "").strip()
    if not email or not product_id or not size:
        raise HTTPException(status_code=400, detail="email, product_id and size are required")

    # Upsert — ignore duplicate (already on waitlist)
    supabase.table("waitlist").upsert(
        {"email": email, "product_id": product_id, "size": size, "status": "pending"},
        on_conflict="email,product_id,size",
        ignore_duplicates=True,
    ).execute()
    return {"ok": True}


@app.get("/waitlist", dependencies=[Depends(require_admin)])
def get_waitlist(product_id: int = None):
    """Admin: list all pending waitlist entries, optionally filtered by product."""
    q = supabase.table("waitlist").select("*").eq("status", "pending").order("created_at", desc=True)
    if product_id:
        q = q.eq("product_id", product_id)
    return (q.execute().data or [])


def _notify_waitlist(product_id: int, size: str, stock: int, bg: BackgroundTasks):
    """Send back-in-stock emails for a (product, size) that just went > 0."""
    if stock <= 0:
        return
    try:
        entries = (
            supabase.table("waitlist")
            .select("id,email")
            .eq("product_id", product_id)
            .eq("size", size)
            .eq("status", "pending")
            .execute()
            .data or []
        )
    except Exception:
        return
    if not entries:
        return

    # Fetch product info for the email
    try:
        prod = supabase.table("products").select("name,slug,image_url,image_urls").eq("id", product_id).limit(1).execute().data
        product = prod[0] if prod else {}
    except Exception:
        product = {}

    product_name = product.get("name") or f"Product #{product_id}"
    product_slug = product.get("slug") or str(product_id)
    # image_urls is an ordered list; fall back to image_url (legacy single-image column)
    image_urls   = product.get("image_urls") or []
    image_url    = (image_urls[0] if image_urls else None) or product.get("image_url") or ""
    site_url     = get_setting("site_url", "https://edmclothes.net")
    shop_url     = f"{site_url}/products/{product_slug}"

    ids_to_fulfill = []
    for entry in entries:
        email = entry["email"]
        html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0a0a0a;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">EDM.CLOTHES</p>
        </td></tr>
        {'<tr><td style="padding:0"><img src="' + image_url + '" width="480" style="display:block;width:100%;max-height:320px;object-fit:cover;" alt="' + product_name + '"/></td></tr>' if image_url else ''}
        <tr><td style="padding:36px 40px 28px;">
          <p style="margin:0 0 6px;font-size:12px;color:#9b9b96;letter-spacing:0.1em;text-transform:uppercase;">Back in stock</p>
          <h1 style="margin:0 0 10px;font-size:22px;font-weight:600;color:#0a0a0a;letter-spacing:-0.02em;">{product_name}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b6b66;line-height:1.6;">
            Good news — <strong>size {size}</strong> is back in stock! Grab yours before it sells out again.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="{shop_url}"
               style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:16px 40px;border-radius:999px;">
              Shop now — Size {size}
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #ecece8;margin:0;"/></td></tr>
        <tr><td style="padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#b0b0a8;">
            © 2026 EDM Clothes · <a href="{site_url}" style="color:#b0b0a8;text-decoration:none;">edmclothes.net</a>
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:#c8c8c0;">
            You requested this notification. <a href="{site_url}/unsubscribe?email={email}" style="color:#c8c8c0;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
        text = (
            f"Good news! {product_name} — size {size} is back in stock.\n\n"
            f"Shop now: {shop_url}\n\n"
            f"---\nYou requested this notification from EDM Clothes.\n"
            f"Unsubscribe: {site_url}/unsubscribe?email={email}"
        )
        bg.add_task(send_email, email, f"Back in stock: {product_name} — size {size}", html, text)
        ids_to_fulfill.append(entry["id"])

    if ids_to_fulfill:
        from datetime import datetime, timezone
        supabase.table("waitlist").update({
            "status": "fulfilled",
            "notified_at": datetime.now(timezone.utc).isoformat(),
        }).in_("id", ids_to_fulfill).execute()


_ALLOWED_IMAGE_EXTS = {"jpg", "jpeg", "png", "gif", "webp", "avif"}
_EXT_CONTENT_TYPE = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                     "gif": "image/gif", "webp": "image/webp", "avif": "image/avif"}

def _safe_image_ext(filename: str) -> str:
    ext = (filename or "").rsplit(".", 1)[-1].lower()
    if ext not in _ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail=f"File type .{ext} not allowed. Use: {', '.join(sorted(_ALLOWED_IMAGE_EXTS))}")
    return ext

@app.post("/upload", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile = File(...)):
    ext = _safe_image_ext(file.filename)
    filename = f"{uuid.uuid4()}.{ext}"
    content = await file.read()
    content_type = _EXT_CONTENT_TYPE[ext]

    supabase.storage.from_("product-images").upload(filename, content, {"content-type": content_type})
    url = supabase.storage.from_("product-images").get_public_url(filename)
    return {"url": url}


@app.put("/products/{product_id}/image", dependencies=[Depends(require_admin)])
async def update_product_image(
    product_id: int,
    files: list[UploadFile] = File(default=[]),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    uploaded_urls: list[str] = []
    for file in files:
        ext = _safe_image_ext(file.filename or "file.jpg")
        filename = f"{uuid.uuid4()}.{ext}"
        path = f"{product_id}/{filename}"
        content = await file.read()
        supabase.storage.from_("product-images").upload(
            path,
            content,
            {"content-type": _EXT_CONTENT_TYPE[ext]}
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


@app.delete("/products/{product_id}/image", dependencies=[Depends(require_admin)])
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

@app.put("/products/{product_id}/images/reorder", dependencies=[Depends(require_admin)])
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


@app.get("/promo-codes/admin", dependencies=[Depends(require_admin)])
def list_promo_codes_admin():
    data = supabase.table("promo_codes").select("*").order("created_at", desc=True).limit(300).execute()
    return data.data or []


@app.post("/promo-codes", dependencies=[Depends(require_admin)])
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
        "one_per_email": bool(payload.one_per_email) if payload.one_per_email is not None else False,
    }
    data = supabase.table("promo_codes").insert(insert_payload).execute()
    if not data.data:
        raise HTTPException(status_code=500, detail="Failed to create promo code")
    return data.data[0]


@app.put("/promo-codes/{promo_id}", dependencies=[Depends(require_admin)])
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


@app.delete("/promo-codes/{promo_id}", dependencies=[Depends(require_admin)])
def delete_promo_code(promo_id: int):
    data = supabase.table("promo_codes").delete().eq("id", promo_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Promo code not found")
    return {"message": "Promo code deleted"}


SHIPPING_COST = 30.0  # fallback default


# ── Shipping calculation (Nova Poshta international) ─────────────────────────

DEFAULT_SHIPPING_CONFIG: dict = {
    # Exchange rate: 1 UAH → EUR. Update periodically in CMS.
    "uah_eur_rate": 0.023,
    # Ukraine domestic (Nova Poshta)
    "ukraine": {
        "brackets": [
            {"max_kg": 1.0,  "price_uah": 80,  "label": "До 1 кг"},
            {"max_kg": 2.0,  "price_uah": 90,  "label": "До 2 кг (мала)"},
            {"max_kg": 10.0, "price_uah": 135, "label": "До 10 кг (середня)"},
            {"max_kg": 30.0, "price_uah": 200, "label": "До 30 кг (велика)"},
        ]
    },
    # Nova Poshta international zones (Europe)
    "europe_zones": {
        "1": {
            "name": "Zone 1 — Poland",
            "brackets": [
                {"max_kg": 0.1,  "price_uah": 385},
                {"max_kg": 0.25, "price_uah": 410},
                {"max_kg": 0.5,  "price_uah": 440},
                {"max_kg": 1.0,  "price_uah": 470},
            ],
            "per_extra_kg_uah": 35,
        },
        "2": {
            "name": "Zone 2 — Czech Republic, Lithuania, Germany, Slovakia, Hungary",
            "brackets": [
                {"max_kg": 0.1,  "price_uah": 610},
                {"max_kg": 0.25, "price_uah": 630},
                {"max_kg": 0.5,  "price_uah": 660},
                {"max_kg": 1.0,  "price_uah": 710},
            ],
            "per_extra_kg_uah": 85,
        },
        "3": {
            "name": "Zone 3 — Italy, Latvia, Austria, Netherlands, Estonia",
            "brackets": [
                {"max_kg": 0.1,  "price_uah": 970},
                {"max_kg": 0.25, "price_uah": 990},
                {"max_kg": 0.5,  "price_uah": 1010},
                {"max_kg": 1.0,  "price_uah": 1040},
            ],
            "per_extra_kg_uah": 75,
        },
        "4": {
            "name": "Zone 4 — Spain, France, UK, Belgium, Denmark, Luxembourg, Monaco, San Marino, Vatican",
            "brackets": [
                {"max_kg": 0.1,  "price_uah": 1160},
                {"max_kg": 0.25, "price_uah": 1180},
                {"max_kg": 0.5,  "price_uah": 1210},
                {"max_kg": 1.0,  "price_uah": 1260},
            ],
            "per_extra_kg_uah": 105,
        },
        "5": {
            "name": "Zone 5 — Andorra, Bulgaria, Gibraltar, Greece, Ireland, Portugal, Slovenia, Finland, Croatia, Sweden",
            "brackets": [
                {"max_kg": 0.1,  "price_uah": 1320},
                {"max_kg": 0.25, "price_uah": 1375},
                {"max_kg": 0.5,  "price_uah": 1430},
                {"max_kg": 1.0,  "price_uah": 1485},
            ],
            "per_extra_kg_uah": 105,
        },
        "6": {
            "name": "Zone 6 — Norway, Liechtenstein, Turkey, Switzerland",
            "brackets": [
                {"max_kg": 0.1,  "price_uah": 2150},
                {"max_kg": 0.25, "price_uah": 2170},
                {"max_kg": 0.5,  "price_uah": 2200},
                {"max_kg": 1.0,  "price_uah": 2310},
            ],
            "per_extra_kg_uah": 80,
        },
        "7": {
            "name": "Zone 7 — Albania, Bosnia & Herzegovina, Malta, Montenegro, North Macedonia, Cyprus, Iceland, Serbia",
            "brackets": [
                {"max_kg": 0.1,  "price_uah": 2150},
                {"max_kg": 0.25, "price_uah": 2170},
                {"max_kg": 0.5,  "price_uah": 2200},
                {"max_kg": 1.0,  "price_uah": 2310},
            ],
            "per_extra_kg_uah": 220,
        },
    },
    # Country code → zone number (Nova Poshta Europe delivery zones)
    "europe_country_zones": {
        "PL": 1,
        "CZ": 2, "LT": 2, "DE": 2, "SK": 2, "HU": 2,
        "AT": 3, "IT": 3, "LV": 3, "NL": 3, "EE": 3,
        "BE": 4, "VA": 4, "GB": 4, "DK": 4, "MC": 4, "SM": 4, "ES": 4, "FR": 4, "LU": 4,
        "AD": 5, "BG": 5, "GI": 5, "GR": 5, "IE": 5, "PT": 5, "SI": 5, "FI": 5, "HR": 5, "SE": 5,
        "NO": 6, "LI": 6, "TR": 6, "CH": 6,
        "AL": 7, "BA": 7, "MT": 7, "ME": 7, "MK": 7, "CY": 7, "IS": 7, "RS": 7,
    },
    # ── Ukr Poshta international parcels (countries NOT covered by Nova Poshta) ──
    # Pricing: base USD for ≤250 g + per_kg_usd for each started 1 kg over 250 g.
    # Source: Ukr Poshta tariffs 13.04.2026.
    "ukrposhta": {
        "usd_eur_rate": 0.92,   # 1 USD → EUR. Adjust periodically in CMS.
        "countries": {
            # ── Western Europe (also in Nova Poshta zones — system picks cheaper) ──
            # Rates from Ukr Poshta 2026 tariff PDF (col1=base ≤250g, col2=per started kg >250g)
            "DE": {"base_usd": 6.50,  "per_kg_usd": 2.00},   # Germany
            "PL": {"base_usd": 12.00, "per_kg_usd": 3.50},   # Poland
            "CZ": {"base_usd": 6.00,  "per_kg_usd": 4.50},   # Czech Republic
            "SK": {"base_usd": 9.50,  "per_kg_usd": 3.50},   # Slovakia
            "HU": {"base_usd": 15.50, "per_kg_usd": 4.50},   # Hungary
            "AT": {"base_usd": 12.00, "per_kg_usd": 4.00},   # Austria (est. ~CZ/SK avg)
            "LT": {"base_usd": 4.00,  "per_kg_usd": 3.50},   # Lithuania
            "LV": {"base_usd": 7.50,  "per_kg_usd": 2.50},   # Latvia
            "EE": {"base_usd": 8.00,  "per_kg_usd": 3.50},   # Estonia
            "NL": {"base_usd": 12.00, "per_kg_usd": 4.50},   # Netherlands
            "BE": {"base_usd": 20.00, "per_kg_usd": 4.50},   # Belgium
            "FR": {"base_usd": 17.00, "per_kg_usd": 5.00},   # France
            "IT": {"base_usd": 13.50, "per_kg_usd": 4.00},   # Italy
            "ES": {"base_usd": 14.50, "per_kg_usd": 5.00},   # Spain
            "PT": {"base_usd": 15.50, "per_kg_usd": 4.00},   # Portugal
            "GB": {"base_usd": 21.00, "per_kg_usd": 5.50},   # United Kingdom
            "IE": {"base_usd": 6.00,  "per_kg_usd": 4.00},   # Ireland
            "DK": {"base_usd": 15.00, "per_kg_usd": 4.50},   # Denmark
            "SE": {"base_usd": 21.00, "per_kg_usd": 5.00},   # Sweden
            "FI": {"base_usd": 20.00, "per_kg_usd": 4.50},   # Finland
            "NO": {"base_usd": 18.00, "per_kg_usd": 5.50},   # Norway
            "CH": {"base_usd": 12.00, "per_kg_usd": 4.50},   # Switzerland
            "LU": {"base_usd": 13.50, "per_kg_usd": 5.00},   # Luxembourg
            "TR": {"base_usd": 19.00, "per_kg_usd": 7.50},   # Turkey
            "GR": {"base_usd": 11.50, "per_kg_usd": 5.00},   # Greece
            "BG": {"base_usd": 10.00, "per_kg_usd": 4.50},   # Bulgaria
            "RO": {"base_usd": 20.50, "per_kg_usd": 4.50},   # Romania
            "HR": {"base_usd": 9.00,  "per_kg_usd": 4.50},   # Croatia
            "SI": {"base_usd": 10.00, "per_kg_usd": 5.00},   # Slovenia
            # ── Zone 7 (NP is very expensive here — UP dramatically cheaper) ──────
            "CY": {"base_usd": 12.50, "per_kg_usd": 6.00},   # Cyprus
            "AL": {"base_usd": 13.50, "per_kg_usd": 6.00},   # Albania (est. ~Balkans avg)
            "BA": {"base_usd": 12.50, "per_kg_usd": 6.00},   # Bosnia & Herzegovina
            "MT": {"base_usd": 13.50, "per_kg_usd": 20.00},  # Malta
            "ME": {"base_usd": 14.00, "per_kg_usd": 6.00},   # Montenegro
            "MK": {"base_usd": 11.00, "per_kg_usd": 6.00},   # North Macedonia
            "IS": {"base_usd": 19.00, "per_kg_usd": 5.50},   # Iceland
            "RS": {"base_usd": 13.50, "per_kg_usd": 5.00},   # Serbia
            # ── Eastern Europe / CIS ─────────────────────────────────────────────
            "MD": {"base_usd": 13.00, "per_kg_usd": 3.50},   # Moldova
            "GE": {"base_usd": 17.00, "per_kg_usd": 6.50},   # Georgia
            "AM": {"base_usd": 14.50, "per_kg_usd": 6.00},   # Armenia
            "AZ": {"base_usd": 11.50, "per_kg_usd": 6.00},   # Azerbaijan
            "KZ": {"base_usd": 19.50, "per_kg_usd": 11.00},  # Kazakhstan
            "UZ": {"base_usd": 22.00, "per_kg_usd": 7.50},   # Uzbekistan
            "TM": {"base_usd": 8.50,  "per_kg_usd": 6.00},   # Turkmenistan
            "TJ": {"base_usd": 9.00,  "per_kg_usd": 10.50},  # Tajikistan
            "KG": {"base_usd": 8.50,  "per_kg_usd": 6.50},   # Kyrgyzstan
            # ── Americas ─────────────────────────────────────────────────────────
            "US": {"base_usd": 9.00,  "per_kg_usd": 9.00},   # USA
            "CA": {"base_usd": 9.00,  "per_kg_usd": 9.00},   # Canada
            "MX": {"base_usd": 10.00, "per_kg_usd": 9.50},   # Mexico
            "AR": {"base_usd": 14.00, "per_kg_usd": 14.00},  # Argentina
            "BR": {"base_usd": 17.00, "per_kg_usd": 11.00},  # Brazil
            "CL": {"base_usd": 16.00, "per_kg_usd": 13.50},  # Chile
            "CO": {"base_usd": 13.00, "per_kg_usd": 13.50},  # Colombia
            "PE": {"base_usd": 11.50, "per_kg_usd": 11.50},  # Peru
            "UY": {"base_usd": 15.00, "per_kg_usd": 14.00},  # Uruguay
            "VE": {"base_usd": 7.50,  "per_kg_usd": 15.00},  # Venezuela
            # ── Asia-Pacific ──────────────────────────────────────────────────────
            "JP": {"base_usd": 20.00, "per_kg_usd": 7.50},   # Japan
            "CN": {"base_usd": 11.50, "per_kg_usd": 6.50},   # China
            "KR": {"base_usd": 12.50, "per_kg_usd": 6.00},   # South Korea
            "HK": {"base_usd": 16.50, "per_kg_usd": 7.00},   # Hong Kong
            "TW": {"base_usd": 10.50, "per_kg_usd": 9.50},   # Taiwan
            "SG": {"base_usd": 11.50, "per_kg_usd": 6.00},   # Singapore
            "MY": {"base_usd": 11.50, "per_kg_usd": 7.00},   # Malaysia
            "TH": {"base_usd": 10.50, "per_kg_usd": 5.50},   # Thailand
            "ID": {"base_usd": 12.50, "per_kg_usd": 9.50},   # Indonesia
            "PH": {"base_usd": 7.50,  "per_kg_usd": 6.50},   # Philippines
            "VN": {"base_usd": 8.00,  "per_kg_usd": 7.50},   # Vietnam
            "IN": {"base_usd": 14.50, "per_kg_usd": 6.50},   # India
            "PK": {"base_usd": 10.00, "per_kg_usd": 8.50},   # Pakistan
            "BD": {"base_usd": 8.50,  "per_kg_usd": 10.50},  # Bangladesh
            "AU": {"base_usd": 13.00, "per_kg_usd": 13.00},  # Australia
            "NZ": {"base_usd": 16.00, "per_kg_usd": 17.00},  # New Zealand
            "MN": {"base_usd": 12.50, "per_kg_usd": 16.50},  # Mongolia
            # ── Middle East / North Africa ────────────────────────────────────────
            "AE": {"base_usd": 8.50,  "per_kg_usd": 4.50},   # UAE
            "SA": {"base_usd": 8.00,  "per_kg_usd": 6.50},   # Saudi Arabia
            "QA": {"base_usd": 9.00,  "per_kg_usd": 6.50},   # Qatar
            "KW": {"base_usd": 9.00,  "per_kg_usd": 5.50},   # Kuwait
            "OM": {"base_usd": 10.50, "per_kg_usd": 6.50},   # Oman
            "BH": {"base_usd": 9.50,  "per_kg_usd": 6.50},   # Bahrain
            "JO": {"base_usd": 9.50,  "per_kg_usd": 5.50},   # Jordan
            "IL": {"base_usd": 10.50, "per_kg_usd": 6.00},   # Israel
            "LB": {"base_usd": 10.00, "per_kg_usd": 7.50},   # Lebanon
            "EG": {"base_usd": 12.00, "per_kg_usd": 7.00},   # Egypt
            "IQ": {"base_usd": 8.50,  "per_kg_usd": 6.50},   # Iraq
            "MA": {"base_usd": 11.00, "per_kg_usd": 8.50},   # Morocco
            "TN": {"base_usd": 15.00, "per_kg_usd": 11.00},  # Tunisia
            # ── Sub-Saharan Africa ────────────────────────────────────────────────
            "ZA": {"base_usd": 15.00, "per_kg_usd": 20.50},  # South Africa
            "KE": {"base_usd": 10.50, "per_kg_usd": 6.50},   # Kenya
            "NG": {"base_usd": 14.00, "per_kg_usd": 8.00},   # Nigeria
            "GH": {"base_usd": 18.00, "per_kg_usd": 7.50},   # Ghana
            "ET": {"base_usd": 8.00,  "per_kg_usd": 11.00},  # Ethiopia
            "SN": {"base_usd": 10.50, "per_kg_usd": 11.00},  # Senegal
            "TZ": {"base_usd": 9.00,  "per_kg_usd": 10.50},  # Tanzania
        }
    },
}


def ceil_to_half_eur(x: float) -> float:
    """Round a price UP to the nearest €0.50 (e.g. 3.10 → 3.50, 3.50 → 3.50, 3.51 → 4.00)."""
    return _math.ceil(x * 2) / 2.0


def get_shipping_config() -> dict:
    """Load shipping config from settings table, fall back to defaults."""
    try:
        row = supabase.table("settings").select("value").eq("key", "shipping_config").limit(1).execute()
        if row.data:
            stored = row.data[0].get("value")
            if isinstance(stored, dict) and stored:
                return stored
    except Exception:
        pass
    return DEFAULT_SHIPPING_CONFIG


def compute_shipping_cost(country_code: str, total_vol_weight_kg: float, config: dict) -> dict:
    """
    Calculate cheapest shipping option (Nova Poshta or Ukr Poshta).
    If a country is covered by both carriers, both prices are calculated
    and the cheaper one is returned.
    Returns dict: {price_eur, zone, label, carrier, weight_kg, ...}
    """
    cc = str(country_code or "").upper().strip()
    weight = max(0.01, float(total_vol_weight_kg or 0))
    # Round UP to nearest 0.1 kg
    weight = _math.ceil(weight * 10) / 10.0
    uah_eur = float(config.get("uah_eur_rate", 0.023))

    # Ukraine domestic — Nova Poshta only
    if cc == "UA":
        ukraine = config.get("ukraine", DEFAULT_SHIPPING_CONFIG["ukraine"])
        brackets = ukraine.get("brackets", DEFAULT_SHIPPING_CONFIG["ukraine"]["brackets"])
        price_uah = float(brackets[-1]["price_uah"]) if brackets else 200.0
        for b in brackets:
            if weight <= float(b["max_kg"]):
                price_uah = float(b["price_uah"])
                break
        return {
            "price_eur": ceil_to_half_eur(price_uah * uah_eur),
            "price_uah": round(price_uah, 2),
            "zone": "UA",
            "carrier": "nova_poshta",
            "label": "Nova Poshta Ukraine",
            "weight_kg": round(weight, 3),
        }

    candidates: list[dict] = []

    # ── Nova Poshta international (Europe zones) ──────────────────────────────
    country_zones = config.get("europe_country_zones", DEFAULT_SHIPPING_CONFIG["europe_country_zones"])
    zone_num = country_zones.get(cc)
    if zone_num is not None:
        zones = config.get("europe_zones", DEFAULT_SHIPPING_CONFIG["europe_zones"])
        zone = zones.get(str(zone_num), {})
        brackets = zone.get("brackets", [])
        per_extra = float(zone.get("per_extra_kg_uah", 0))
        zone_name = zone.get("name", f"Zone {zone_num}")
        if weight <= 1.0:
            price_uah = float(brackets[-1]["price_uah"]) if brackets else 1000.0
            for b in brackets:
                if weight <= float(b["max_kg"]):
                    price_uah = float(b["price_uah"])
                    break
        else:
            base_uah = float(brackets[-1]["price_uah"]) if brackets else 1000.0
            extra_kg = _math.ceil(weight - 1.0)
            price_uah = base_uah + extra_kg * per_extra
        candidates.append({
            "price_eur": ceil_to_half_eur(price_uah * uah_eur),
            "price_uah": round(price_uah, 2),
            "zone": zone_num,
            "carrier": "nova_poshta",
            "label": "Nova Poshta International",
            "weight_kg": round(weight, 3),
        })

    # ── Ukr Poshta international ──────────────────────────────────────────────
    ukrposhta = config.get("ukrposhta", DEFAULT_SHIPPING_CONFIG.get("ukrposhta", {}))
    up_countries = ukrposhta.get("countries", {})
    usd_eur = float(ukrposhta.get("usd_eur_rate", 0.92))
    if cc in up_countries:
        rates = up_countries[cc]
        base_usd = float(rates.get("base_usd", 15.0))
        per_kg_usd = float(rates.get("per_kg_usd", 10.0))
        if weight <= 0.25:
            price_usd = base_usd
        else:
            extra_kg = _math.ceil(weight - 0.25)
            price_usd = base_usd + extra_kg * per_kg_usd
        candidates.append({
            "price_eur": ceil_to_half_eur(price_usd * usd_eur),
            "price_usd": round(price_usd, 2),
            "zone": "ukrposhta",
            "carrier": "ukrposhta",
            "label": "Ukr Poshta International",
            "weight_kg": round(weight, 3),
        })

    # Pick the cheapest option
    if candidates:
        return min(candidates, key=lambda x: x["price_eur"])

    # Country not covered by any carrier
    return {
        "price_eur": None,
        "zone": "unavailable",
        "carrier": None,
        "label": "Delivery not available to this country",
        "weight_kg": round(weight, 3),
    }


class ShippingCalculateRequest(BaseModel):
    country: str
    items: list[dict]  # [{id, quantity, volumetric_weight?}]


@app.post("/shipping/calculate")
def shipping_calculate(payload: ShippingCalculateRequest):
    """Calculate shipping cost for a given country + cart items."""
    config = get_shipping_config()
    total_vol_weight = 0.0
    for item in payload.items:
        qty = max(1, int(item.get("quantity", 1)))
        vol_w = item.get("volumetric_weight")
        if vol_w is None:
            try:
                prod = get_visible_product_row(int(item["id"]))
                vol_w = float(prod.get("volumetric_weight") or 0.3)
            except Exception:
                vol_w = 0.3  # fallback: 300 g per item
        total_vol_weight += float(vol_w) * qty
    total_vol_weight = max(0.1, total_vol_weight)
    result = compute_shipping_cost(payload.country, total_vol_weight, config)
    return {**result, "total_vol_weight_kg": round(total_vol_weight, 3)}


@app.get("/shipping/config")
def get_shipping_config_endpoint(request: Request):
    return get_shipping_config()


@app.put("/shipping/config", dependencies=[Depends(require_admin)])
def update_shipping_config(payload: dict):
    supabase.table("settings").upsert(
        {"key": "shipping_config", "value": payload},
        on_conflict="key",
    ).execute()
    return {"ok": True}


def get_shipping_settings() -> tuple[float, float]:
    """Return (free_threshold, shipping_cost) from the settings table."""
    try:
        data = supabase.table("settings").select("key,value").in_(
            "key", ["shipping_free_threshold", "shipping_cost"]
        ).execute()
        result = {row["key"]: row["value"] for row in (data.data or [])}
        threshold = float(result.get("shipping_free_threshold") or 120)
        cost = float(result.get("shipping_cost") or 30)
        return threshold, cost
    except Exception:
        return 120.0, 30.0


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
    total_vol_weight = 0.0  # kg, for shipping calculation

    for item in payload.items:
        qty = max(1, int(item.quantity))
        # Always fetch the authoritative price from DB — never trust client-supplied price
        try:
            db_product = get_visible_product_row(int(item.id))
            price = float(db_product.get("price") or item.price)
        except HTTPException:
            raise HTTPException(status_code=400, detail=f"Product {item.id} not found or unavailable")
        # Accumulate volumetric weight from DB (default 0.3 kg per item)
        total_vol_weight += float(db_product.get("volumetric_weight") or 0.3) * qty
        normalized_item = {
            "id": int(item.id),
            "name": db_product.get("name") or item.name,
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

    # Calculate shipping via Nova Poshta / Ukr Poshta zone table (server-authoritative)
    _shipping_cfg = get_shipping_config()
    _country = str(payload.country or "DE")
    _ship_result = compute_shipping_cost(_country, total_vol_weight, _shipping_cfg)
    if _ship_result.get("price_eur") is None:
        raise HTTPException(status_code=400, detail=f"Delivery to {_country} is currently not available")
    shipping_cost_cfg = float(_ship_result["price_eur"])

    free_threshold, _ = get_shipping_settings()
    qualifies_free_shipping = subtotal >= free_threshold

    promo = None
    promo_discount = 0.0
    promo_type = None
    normalized_promo_code = normalize_promo_code(payload.promo_code)
    if normalized_promo_code:
        promo = get_active_promo_row(normalized_promo_code)
        if not promo:
            raise HTTPException(status_code=400, detail="Promo code is invalid or expired")
        promo_type = str(promo.get("discount_type") or "").lower()
        promo_discount = promo_discount_amount(subtotal, promo, shipping_cost_cfg)
        if promo_discount <= 0:
            raise HTTPException(status_code=400, detail="Promo code does not apply")

    checkout_origin = resolve_checkout_origin(http_request, payload)

    # Per-email usage check (e.g. WELCOME10 — one use per customer account)
    if promo and promo.get("one_per_email") and payload.customer_email:
        email_norm = normalize_email(payload.customer_email)
        promo_code_norm = normalize_promo_code(promo.get("code"))
        try:
            already_used = (
                supabase.table("orders")
                .select("id")
                .ilike("email", email_norm)
                .in_("status", ["paid", "shipped", "delivered"])
                .filter("metadata_json->>promo_code", "eq", promo_code_norm)
                .limit(1)
                .execute()
            )
            if already_used.data:
                raise HTTPException(status_code=400, detail="This promo code can only be used once per account")
        except HTTPException:
            raise
        except Exception:
            pass  # If check fails, allow the order to continue

    should_charge_shipping = promo_type != "free_shipping" and not qualifies_free_shipping

    # Apply percent/fixed discount to PRODUCT line items only (not shipping).
    # We bake the discount into unit_amount instead of using Stripe coupons,
    # so Stripe charges the same total as our internal calculation.
    if promo and promo_type in ("percent", "fixed"):
        promo_value = float(promo.get("discount_value") or 0)
        if promo_type == "percent":
            factor = 1.0 - promo_value / 100.0
        else:  # fixed — distribute proportionally across items
            factor = max(0.0, (subtotal - promo_discount) / subtotal) if subtotal > 0 else 1.0
        line_items = [
            {**li, "price_data": {**li["price_data"], "unit_amount": max(1, round(li["price_data"]["unit_amount"] * factor))}}
            for li in line_items
        ]

    if should_charge_shipping:
        line_items.append({
            "price_data": {
                "currency": "eur",
                "product_data": {"name": "Shipping"},
                "unit_amount": int(shipping_cost_cfg * 100),
            },
            "quantity": 1,
        })
    amount_total = subtotal - promo_discount + (shipping_cost_cfg if should_charge_shipping else 0.0)

    reserve_stock(normalized_items)
    client_reference_id = str(uuid.uuid4())
    created_order = None

    try:
        metadata_json = {"source": "web_checkout"}
        # UTM attribution — capture last-touch email/ad source at purchase time
        if payload.utm and isinstance(payload.utm, dict):
            allowed_utm = {"utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"}
            for k, v in payload.utm.items():
                if k in allowed_utm and isinstance(v, str) and v:
                    metadata_json[k] = v[:200]
        if promo:
            metadata_json["promo_code"] = promo.get("code")
            metadata_json["promo_discount_type"] = promo.get("discount_type")
            metadata_json["promo_discount_value"] = promo.get("discount_value")
            metadata_json["promo_discount_amount"] = promo_discount
        if payload.comment:
            metadata_json["order_note"] = payload.comment[:500]
        # Shipping carrier info (server-computed)
        metadata_json["shipping_carrier"] = _ship_result.get("carrier") or ""
        metadata_json["shipping_label"] = _ship_result.get("label") or ""
        metadata_json["shipping_cost_eur"] = round(shipping_cost_cfg, 2)
        metadata_json["shipping_weight_kg"] = _ship_result.get("weight_kg")

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

        # Discount is already baked into product line item prices above.
        # No Stripe coupons needed — they would apply to shipping too.

        # For quick checkout (from cart) Stripe collects shipping; for normal
        # checkout the customer already filled it in on our Details page.
        stripe_session_params: dict = dict(
            payment_method_types=["card", "klarna", "paypal"],
            line_items=line_items,
            mode="payment",
            client_reference_id=client_reference_id,
            billing_address_collection="required",
            customer_email=payload.customer_email,
            expires_at=int((datetime.now(tz=timezone.utc) + timedelta(minutes=30)).timestamp()),
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
        # Enrich order with Stripe-provided email & shipping before sending emails.
        # For quick checkout the customer email/address is collected by Stripe,
        # not our form — so the DB order might not have it yet at webhook time.
        stripe_email = as_dict(data_obj.get("customer_details")).get("email")
        if stripe_email:
            order["email"] = stripe_email
        for field, value in extract_shipping_fields(data_obj).items():
            if first_non_empty(value) is not None:
                order[field] = value
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
        # Mark abandoned cart as converted so no recovery email is sent
        _mark_abandoned_cart_completed(order_email)
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


@app.get("/orders", dependencies=[Depends(require_admin)])
def list_orders():
    data = supabase.table("orders").select("*").order("created_at", desc=True).limit(100).execute()
    return data.data


_USER_VISIBLE_STATUSES = ["paid", "shipped", "delivered"]


class OrderTrackRequest(BaseModel):
    email: str

@app.post("/orders/track")
def track_orders(payload: OrderTrackRequest):
    """POST so email stays out of URL / server logs / analytics."""
    normalized = str(payload.email or "").strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail="email is required")
    data = (
        supabase.table("orders")
        .select("*")
        .ilike("email", normalized)
        .in_("status", _USER_VISIBLE_STATUSES)
        .order("created_at", desc=False)
        .limit(200)
        .execute()
    )
    items = [enrich_order_shipping(row) for row in (data.data or [])]
    numbered = [{**row, "user_order_number": idx + 1} for idx, row in enumerate(items)]
    return list(reversed(numbered))


@app.post("/orders/track/{order_id}")
def track_order_details(order_id: int, payload: OrderTrackRequest):
    """POST so email stays out of URL / server logs / analytics."""
    normalized = str(payload.email or "").strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail="email is required")
    data = (
        supabase.table("orders")
        .select("*")
        .ilike("email", normalized)
        .in_("status", _USER_VISIBLE_STATUSES)
        .order("created_at", desc=False)
        .limit(200)
        .execute()
    )
    items = [enrich_order_shipping(row) for row in (data.data or [])]
    for idx, row in enumerate(items, start=1):
        if int(row.get("id") or 0) == order_id:
            return {**row, "user_order_number": idx}
    raise HTTPException(status_code=404, detail="Order not found")


_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I
)

@app.get("/orders/{id_or_session}")
def get_order(id_or_session: str):
    try:
        # stripe_session_id is TEXT — always safe
        result = supabase.table("orders").select("*").eq("stripe_session_id", id_or_session).limit(1).execute()
        if result.data:
            return result.data[0]

        # client_reference_id is UUID — only query if value is a valid UUID
        if _UUID_RE.match(id_or_session):
            result = supabase.table("orders").select("*").eq("client_reference_id", id_or_session).limit(1).execute()
            if result.data:
                return result.data[0]

        # integer primary key
        if id_or_session.isdigit():
            result = supabase.table("orders").select("*").eq("id", int(id_or_session)).limit(1).execute()
            if result.data:
                return result.data[0]

        raise HTTPException(status_code=404, detail="Order not found")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"get_order error: {type(exc).__name__}: {exc}") from exc


# ── Admin order management ────────────────────────────────────────────────────

VALID_ORDER_STATUSES = {"pending", "paid", "shipped", "delivered", "cancelled", "payment_failed"}


class OrderUpdatePayload(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None


@app.patch("/orders/{order_id}", dependencies=[Depends(require_admin)])
def update_order_admin(order_id: int, payload: OrderUpdatePayload):
    try:
        updates: dict = {"updated_at": now_iso()}
        if payload.status is not None:
            if payload.status not in VALID_ORDER_STATUSES:
                raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {', '.join(sorted(VALID_ORDER_STATUSES))}")
            updates["status"] = payload.status

            # Restore stock when admin manually cancels an order
            if payload.status == "cancelled":
                try:
                    cur = supabase.table("orders").select("status,items_json").eq("id", order_id).limit(1).execute()
                    if cur.data:
                        current_status = cur.data[0].get("status") or ""
                        items = cur.data[0].get("items_json") or []
                        if items and current_status not in ("cancelled", "payment_failed"):
                            if current_status == "pending":
                                release_reserved_stock(items)
                            elif current_status in ("paid", "shipped", "delivered"):
                                restore_sold_stock(items)
                except Exception as exc:
                    print(f"Warning: stock restoration on cancel failed for order {order_id}: {exc}")

            if payload.status == "shipped":
                try:
                    row = supabase.table("orders").select("shipped_at").eq("id", order_id).limit(1).execute()
                    if row.data and not row.data[0].get("shipped_at"):
                        updates["shipped_at"] = now_iso()
                except Exception:
                    updates["shipped_at"] = now_iso()
        if payload.tracking_number is not None:
            updates["tracking_number"] = payload.tracking_number or None
        if payload.tracking_url is not None:
            updates["tracking_url"] = normalize_tracking_url(payload.tracking_url) or None

        # Remove tracking fields if columns don't exist yet (migration 013 pending)
        safe_updates = {k: v for k, v in updates.items()
                        if k not in ("tracking_number", "tracking_url", "shipped_at")}
        try:
            result = supabase.table("orders").update(updates).eq("id", order_id).execute()
        except Exception:
            result = supabase.table("orders").update(safe_updates).eq("id", order_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"update_order error: {type(exc).__name__}: {exc}") from exc


@app.delete("/orders/{order_id}", dependencies=[Depends(require_admin)])
def delete_order_admin(order_id: int):
    supabase.table("orders").delete().eq("id", order_id).execute()
    return {"ok": True}


def normalize_tracking_url(raw: str) -> str:
    """Strip browser-internal schemes (x-webdoc://, etc.) and ensure https://."""
    url = (raw or "").strip()
    if not url:
        return url
    # Strip any non-http scheme prefix: e.g. "x-webdoc://UUID/novapost.com" → "novapost.com"
    if "://" in url and not url.startswith(("http://", "https://")):
        # Everything after the last "/" of the bogus authority
        url = re.sub(r'^[^:]+://[^/]+/', '', url)
    # Remove any leading slashes left over
    url = url.lstrip("/")
    # Add https:// if still no scheme
    if url and not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def build_shipping_notification_email(order: dict) -> tuple[str, str]:
    """Returns (html, text) for the shipping notification email."""
    first_name = (str(order.get("shipping_name") or "").split() or ["there"])[0]
    order_id_val = 10000 + int(order.get("id") or 0)  # human-readable order number
    tracking_number = str(order.get("tracking_number") or "").strip()
    tracking_url = normalize_tracking_url(str(order.get("tracking_url") or ""))
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


@app.post("/orders/{order_id}/resend-confirmation", dependencies=[Depends(require_admin)])
def resend_order_confirmation(order_id: int):
    result = supabase.table("orders").select("*").eq("id", order_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = result.data[0]
    customer_email = str(order.get("email") or "").strip()
    if not customer_email:
        raise HTTPException(status_code=400, detail="Order has no customer email")
    try:
        send_order_confirmation_emails(order)  # uses 10000+id internally
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {exc}") from exc
    return {"ok": True}


@app.post("/orders/{order_id}/fit-feedback")
def order_fit_feedback(order_id: int, payload: dict = Body(...)):
    """
    Let a customer submit per-item size fit feedback for a delivered order.
    fit must be one of: perfect | too_small | too_big
    item_index (int) identifies which item in items_json is being rated.
    Request must include the order's customer email for ownership check.
    """
    fit        = str(payload.get("fit") or "").strip()
    email      = normalize_email(str(payload.get("email") or ""))
    item_index = payload.get("item_index")

    if fit not in ("perfect", "too_small", "too_big"):
        raise HTTPException(status_code=400, detail="fit must be perfect | too_small | too_big")
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    if item_index is None:
        raise HTTPException(status_code=400, detail="item_index required")

    result = supabase.table("orders").select("id,status,email,metadata_json").eq("id", order_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = result.data[0]

    if normalize_email(str(order.get("email") or "")) != email:
        raise HTTPException(status_code=403, detail="Forbidden")
    if order.get("status") != "delivered":
        raise HTTPException(status_code=400, detail="Fit feedback is only available for delivered orders")

    meta = as_dict(order.get("metadata_json"))
    item_feedback = meta.get("item_fit_feedback") or {}
    item_feedback[str(item_index)] = {"fit": fit, "at": now_iso()}
    meta["item_fit_feedback"] = item_feedback
    supabase.table("orders").update({"metadata_json": meta, "updated_at": now_iso()}).eq("id", order_id).execute()
    return {"ok": True, "fit": fit, "item_index": item_index}


@app.post("/orders/{order_id}/notify-shipped", dependencies=[Depends(require_admin)])
def notify_order_shipped(order_id: int):
    result = supabase.table("orders").select("*").eq("id", order_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = enrich_order_shipping(result.data[0])
    customer_email = str(order.get("email") or "").strip()
    if not customer_email:
        raise HTTPException(status_code=400, detail="Order has no customer email")
    html, text = build_shipping_notification_email(order)
    display_num = 10000 + order_id
    send_email(customer_email, f"Your order #{display_num} has been shipped! 🚀", html, text)
    supabase.table("orders").update({"shipped_at": now_iso(), "updated_at": now_iso()}).eq("id", order_id).execute()
    return {"ok": True}


@app.post("/email-subscribers/capture")
def capture_email_subscriber(payload: SubscriberCaptureRequest):
    email = normalize_email(payload.email)
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    # Check if already actively subscribed
    existing = supabase.table("email_subscribers").select("id,is_active").eq("email", email).limit(1).execute()
    row = existing.data[0] if existing.data else None
    is_new = not row
    already_active = row and row.get("is_active") is not False

    if already_active and not is_new:
        return {"ok": True, "already_subscribed": True}

    capture_subscriber_email(email, payload.source or "unknown", payload.metadata or {})

    if is_new:
        # Generate unique WELCOME_XXXXX code
        welcome_code = None
        for _ in range(10):
            suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
            candidate = f"WELCOME_{suffix}"
            exists = supabase.table("promo_codes").select("id").eq("code", candidate).limit(1).execute()
            if not exists.data:
                welcome_code = candidate
                break

        if welcome_code:
            discount_pct = float(get_setting("welcome_discount_percent", "10"))
            supabase.table("promo_codes").insert({
                "code": welcome_code,
                "discount_type": "percent",
                "discount_value": discount_pct,
                "usage_limit": 1,
                "used_count": 0,
                "is_active": True,
                "one_per_email": True,
            }).execute()

            site_url = get_setting("site_url", "https://edmclothes.net")
            discount_label = f"{int(discount_pct)}%" if discount_pct == int(discount_pct) else f"{discount_pct}%"
            html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#0a0a0a;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">EDM.CLOTHES</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#0a0a0a;letter-spacing:-0.02em;">Welcome to EDM Clothes</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#6b6b66;line-height:1.6;">
              Thanks for subscribing! Here's your exclusive discount code for <strong>{discount_label} off</strong> your first order:
            </p>
            <div style="background:#f5f5f3;border-radius:12px;padding:20px;text-align:center;margin:0 0 28px;">
              <p style="margin:0 0 6px;font-size:12px;color:#9b9b96;letter-spacing:0.1em;text-transform:uppercase;">Your code</p>
              <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:0.12em;color:#0a0a0a;">{welcome_code}</p>
            </div>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="{site_url}/products"
                     style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:16px 40px;border-radius:999px;">
                    Shop now
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:13px;color:#9b9b96;line-height:1.6;">
              Enter the code at checkout. Single use, valid on any order.
            </p>
          </td>
        </tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #ecece8;margin:0;"/></td></tr>
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#b0b0a8;">
              © 2026 EDM Clothes · <a href="{site_url}" style="color:#b0b0a8;text-decoration:none;">edmclothes.net</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#c8c8c0;">
              Don't want to hear from us?
              <a href="{site_url}/unsubscribe?email={email}" style="color:#c8c8c0;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
            text = f"Welcome to EDM Clothes!\n\nYour discount code: {welcome_code}\n\n{discount_label} off your first order. Use at checkout on {site_url}/products\n\n---\nTo unsubscribe: {site_url}/unsubscribe?email={email}"
            send_email(email, "Welcome — here's your discount code", html, text)

    return {"ok": True, "already_subscribed": False}


@app.get("/settings")
def get_all_settings():
    data = supabase.table("settings").select("key,value").execute()
    return {row["key"]: row.get("value", "") for row in (data.data or [])}


@app.put("/settings", dependencies=[Depends(require_admin)])
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

@app.get("/homepage-slides/admin", dependencies=[Depends(require_admin)])
def get_homepage_slides_admin():
    """Admin: all slides."""
    data = supabase.table("homepage_slides").select("*").order("sort_order").execute()
    return data.data or []

@app.post("/homepage-slides/upload", dependencies=[Depends(require_admin)])
async def upload_and_create_homepage_slide(
    file: UploadFile = File(...),
    href: str = Form("/products"),
    title: str = Form(""),
):
    """Upload a photo and create a slide in one shot."""
    ext = _safe_image_ext(file.filename or "file.jpg")
    path = f"homepage/{uuid.uuid4()}.{ext}"
    content = await file.read()
    supabase.storage.from_("product-images").upload(path, content, {"content-type": _EXT_CONTENT_TYPE[ext]})
    url = supabase.storage.from_("product-images").get_public_url(path)
    existing = supabase.table("homepage_slides").select("sort_order").order("sort_order", desc=True).limit(1).execute()
    next_order = (existing.data[0]["sort_order"] + 1) if existing.data else 0
    slide_data = {"image_url": url, "href": href or "/products", "title": title or None, "sort_order": next_order, "is_active": True}
    data = supabase.table("homepage_slides").insert(slide_data).execute()
    if not data.data:
        raise HTTPException(status_code=500, detail="Failed to create slide")
    return data.data[0]

@app.post("/homepage-slides", dependencies=[Depends(require_admin)])
def create_homepage_slide(slide: HomepageSlide):
    data = supabase.table("homepage_slides").insert(slide.dict()).execute()
    if not data.data:
        raise HTTPException(status_code=500, detail="Failed to create slide")
    return data.data[0]

@app.put("/homepage-slides/reorder", dependencies=[Depends(require_admin)])
def reorder_homepage_slides(payload: HomepageSlidesReorder):
    for order, slide_id in enumerate(payload.ids):
        supabase.table("homepage_slides").update({"sort_order": order}).eq("id", slide_id).execute()
    return {"ok": True}

@app.put("/homepage-slides/{slide_id}", dependencies=[Depends(require_admin)])
def update_homepage_slide(slide_id: int, slide: HomepageSlideUpdate):
    updates = {k: v for k, v in slide.dict().items() if v is not None}
    data = supabase.table("homepage_slides").update(updates).eq("id", slide_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Slide not found")
    return data.data[0]

@app.delete("/homepage-slides/{slide_id}", dependencies=[Depends(require_admin)])
def delete_homepage_slide(slide_id: int):
    supabase.table("homepage_slides").delete().eq("id", slide_id).execute()
    return {"ok": True}


class ContactMessagePayload(BaseModel):
    name: str
    email: str
    subject: Optional[str] = None
    message: str

@app.post("/contact")
def send_contact_message(payload: ContactMessagePayload, background_tasks: BackgroundTasks):
    name    = str(payload.name or "").strip()
    email   = normalize_email(payload.email)
    subject = str(payload.subject or "").strip() or "Contact form message"
    message = str(payload.message or "").strip()

    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="Name, email and message are required")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    # Recipient priority: ORDER_ALERT_EMAIL env var (works for order notifications)
    # → admin_email in settings table → Zoho user → hardcoded fallback
    _db_admin = get_setting("admin_email", "")
    admin_email = (
        str(ORDER_ALERT_EMAIL or "").strip()
        or _db_admin.strip()
        or str(ZOHO_SMTP_USER or "").strip()
        or "sales@edmclothes.net"
    )
    site_url = get_setting("site_url", "https://edmclothes.net")
    print(f"contact form: admin_email={admin_email!r} ORDER_ALERT_EMAIL={ORDER_ALERT_EMAIL!r} db_admin={_db_admin!r}")

    # HTML-escape all user-supplied fields before embedding in email
    e_name    = _html.escape(name)
    e_email   = _html.escape(email)
    e_subject = _html.escape(subject)
    e_message = _html.escape(message)

    # Email to admin
    admin_html = f"""<!DOCTYPE html>
<html><body style="font-family:sans-serif;padding:32px;color:#111;">
  <h2 style="margin:0 0 16px">New contact message</h2>
  <p><strong>From:</strong> {e_name} &lt;{e_email}&gt;</p>
  <p><strong>Subject:</strong> {e_subject}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
  <p style="white-space:pre-wrap;line-height:1.6">{e_message}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
  <p style="color:#888;font-size:12px">Reply to: <a href="mailto:{e_email}">{e_email}</a></p>
</body></html>"""
    background_tasks.add_task(
        send_email, admin_email, f"[Contact] {subject} — {name}",
        admin_html, f"From: {name} <{email}>\n\n{message}"
    )

    # Confirmation to user
    confirm_html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0a0a0a;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">EDM.CLOTHES</p>
        </td></tr>
        <tr><td style="padding:36px 40px 28px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#0a0a0a;">We got your message</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b6b66;line-height:1.6;">
            Hi {e_name}, thanks for reaching out. We'll get back to you as soon as possible — usually within 1–2 business days.
          </p>
          <div style="background:#f5f5f3;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#9b9b96;text-transform:uppercase;letter-spacing:0.08em;">Your message</p>
            <p style="margin:0;font-size:14px;color:#444;line-height:1.6;white-space:pre-wrap">{e_message}</p>
          </div>
          <a href="{site_url}/products" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:999px;">Browse store</a>
        </td></tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #ecece8;"/></td></tr>
        <tr><td style="padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#b0b0a8;">© 2026 EDM Clothes · <a href="{site_url}" style="color:#b0b0a8;text-decoration:none;">edmclothes.net</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    background_tasks.add_task(
        send_email, email, "We received your message — EDM Clothes",
        confirm_html, f"Hi {name},\n\nThanks for reaching out! We'll reply within 1-2 business days.\n\nYour message:\n{message}"
    )

    return {"ok": True}


@app.get("/admin/test-email", dependencies=[Depends(require_admin)])
def test_email_delivery(to: str = ""):
    """Send a test email and return a full diagnostic report.
    Usage: GET /admin/test-email?to=you@example.com
    If 'to' is omitted, sends to the same address as contact-form admin notifications."""
    _db_admin = get_setting("admin_email", "")
    recipient = (
        str(to or "").strip()
        or str(ORDER_ALERT_EMAIL or "").strip()
        or _db_admin.strip()
        or str(ZOHO_SMTP_USER or "").strip()
        or "sales@edmclothes.net"
    )
    result = send_email_sync_debug(
        recipient,
        "EDM Clothes — email delivery test",
        "<h2>Test email</h2><p>If you see this, email delivery is working ✅</p>",
        "Test email — if you see this, email delivery is working.",
    )
    result["config"] = {
        "zoho_host": ZOHO_SMTP_HOST,
        "zoho_port": ZOHO_SMTP_PORT,
        "zoho_user_set": bool(ZOHO_SMTP_USER),
        "zoho_pass_set": bool(ZOHO_SMTP_PASSWORD),
        "resend_key_set": bool(RESEND_API_KEY),
        "resend_from": RESEND_FROM_EMAIL or "(not set)",
        "order_alert_email": ORDER_ALERT_EMAIL or "(not set)",
        "db_admin_email": _db_admin or "(not set in DB)",
        "resolved_recipient": recipient,
    }
    return result


# ── FAQ & Static Pages ──────────────────────────────────────────────────────

DEFAULT_FAQ_HTML = """<details class="faq-item"><summary>How long does shipping take?</summary><p>Standard shipping takes 5–10 business days within Europe. Express options may be available at checkout.</p></details>
<details class="faq-item"><summary>Do you ship internationally?</summary><p>Yes, we ship to most countries in Europe and beyond. Shipping costs are calculated at checkout based on your location.</p></details>
<details class="faq-item"><summary>What is your return policy?</summary><p>We accept returns within 14 days of delivery. Items must be unworn, unwashed, and in original condition with tags attached.</p></details>
<details class="faq-item"><summary>How do I track my order?</summary><p>Once your order ships, you'll receive a confirmation email with a tracking number. You can also check your order status in your account.</p></details>
<details class="faq-item"><summary>Can I change or cancel my order?</summary><p>Orders can be changed or cancelled within 1 hour of placement. After that, they enter processing and cannot be modified. Contact us immediately if you need help.</p></details>
<details class="faq-item"><summary>What payment methods do you accept?</summary><p>We accept all major credit and debit cards (Visa, Mastercard, Amex) as well as Apple Pay and Google Pay.</p></details>"""

DEFAULT_SHIPPING = json.dumps({
    "sections": [
        {"title": "Processing time", "body": "All orders are processed within 1–3 business days. Orders placed on weekends or public holidays are processed the next business day."},
        {"title": "Shipping rates", "body": "Standard shipping is €30. Free shipping is available on orders over €120."},
        {"title": "Delivery times", "body": "Standard shipping takes 5–10 business days within Europe. International shipping may take longer depending on the destination country."},
        {"title": "Tracking", "body": "Once your order ships, you'll receive an email with a tracking number. Use it to follow your parcel on the carrier's website."},
        {"title": "Customs & duties", "body": "For orders outside the EU, customs duties and import taxes may apply. These are the responsibility of the customer and are not included in our prices."},
    ]
})

DEFAULT_RETURNS = json.dumps({
    "sections": [
        {"title": "Return window", "body": "We accept returns within 14 days of the delivery date. After this period, we are unable to accept returns."},
        {"title": "Eligibility", "body": "Items must be unworn, unwashed, and undamaged with original tags attached. Final Sale and custom items are not eligible for return."},
        {"title": "How to return", "body": "Email us at sales@edmclothes.net with your order number and reason for return. We'll send you instructions within 1–2 business days."},
        {"title": "Refunds", "body": "Once your return is received and approved, your refund will be processed to the original payment method within 5–10 business days."},
        {"title": "Exchanges", "body": "Free exchanges are available for a different size or colour of the same item, subject to availability."},
        {"title": "Return shipping", "body": "Return shipping costs are the customer's responsibility unless the return is due to our error (wrong or defective item)."},
    ]
})

def get_json_setting(key: str, default: str) -> list | dict:
    raw = get_setting(key, default)
    try:
        return json.loads(raw)
    except Exception:
        return json.loads(default)

def set_json_setting(key: str, value) -> None:
    supabase.table("settings").upsert(
        {"key": key, "value": json.dumps(value, ensure_ascii=False), "updated_at": now_iso()},
        on_conflict="key"
    ).execute()

def _migrate_faq_to_details(html: str) -> str:
    """Migrate old <div class="faq-item"><h3>Q</h3><p>A</p></div> to <details> accordion."""
    return re.sub(
        r'<div class="faq-item"><h3>(.*?)</h3><p>(.*?)</p></div>',
        r'<details class="faq-item"><summary>\1</summary><p>\2</p></details>',
        html, flags=re.DOTALL
    )

def _get_faq_html() -> str:
    """Return FAQ HTML, auto-initialising and auto-migrating from old format if needed."""
    try:
        row = supabase.table("settings").select("value").eq("key", "faq_html").limit(1).execute()
        if row.data:
            val = row.data[0].get("value") or ""
            if val.strip():
                # Auto-migrate old div-based format to details/summary
                if '<div class="faq-item">' in val:
                    val = _migrate_faq_to_details(val)
                    supabase.table("settings").upsert(
                        {"key": "faq_html", "value": val, "updated_at": now_iso()},
                        on_conflict="key"
                    ).execute()
                return val
    except Exception:
        pass
    # Key missing or empty — write default so CMS shows correct content
    try:
        supabase.table("settings").upsert(
            {"key": "faq_html", "value": DEFAULT_FAQ_HTML, "updated_at": now_iso()},
            on_conflict="key"
        ).execute()
    except Exception:
        pass
    return DEFAULT_FAQ_HTML

@app.get("/faq")
def get_faq():
    return {"html": _get_faq_html()}

@app.get("/faq/admin", dependencies=[Depends(require_admin)])
def get_faq_admin():
    return {"html": _get_faq_html()}

@app.put("/faq/admin", dependencies=[Depends(require_admin)])
async def update_faq(request: Request):
    body = await request.json()
    # Accept both {"html": "..."} and plain string
    if isinstance(body, dict):
        html = body.get("html", "")
    elif isinstance(body, str):
        html = body
    else:
        html = ""
    supabase.table("settings").upsert(
        {"key": "faq_html", "value": html, "updated_at": now_iso()},
        on_conflict="key"
    ).execute()
    return {"ok": True}

@app.get("/pages/{slug}")
def get_page(slug: str):
    allowed = {"shipping", "returns"}
    if slug not in allowed:
        raise HTTPException(status_code=404, detail="Page not found")
    default = DEFAULT_SHIPPING if slug == "shipping" else DEFAULT_RETURNS
    return get_json_setting(f"page_{slug}", default)

@app.put("/pages/{slug}", dependencies=[Depends(require_admin)])
def update_page(slug: str, data: dict):
    allowed = {"shipping", "returns"}
    if slug not in allowed:
        raise HTTPException(status_code=404, detail="Page not found")
    set_json_setting(f"page_{slug}", data)
    return {"ok": True}


@app.get("/email-subscribers", dependencies=[Depends(require_admin)])
def list_email_subscribers(limit: int = 500, all: bool = False):
    safe_limit = max(1, min(int(limit or 500), 5000))
    query = supabase.table("email_subscribers").select("*")
    if not all:
        query = query.eq("is_active", True)
    data = query.order("last_seen_at", desc=True).limit(safe_limit).execute()
    return data.data or []


@app.get("/email-subscribers/export.csv", dependencies=[Depends(require_admin)])
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


# ── Abandoned cart recovery ───────────────────────────────────────────────────

class AbandonedCartPayload(BaseModel):
    email:      str
    first_name: Optional[str] = None
    items:      list          = []
    total_eur:  Optional[float] = None


@app.post("/abandoned-cart")
def save_abandoned_cart(payload: AbandonedCartPayload):
    """
    Called by the frontend when the user moves from /checkout → /confirm.
    Upserts a row per email — if the user goes back and changes the cart
    we get the latest snapshot, and the 2-hour countdown resets.
    """
    email = normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")

    now = now_iso()
    supabase.table("abandoned_carts").upsert({
        "email":      email,
        "first_name": (payload.first_name or "").strip() or None,
        "items_json": payload.items,
        "total_eur":  payload.total_eur,
        "status":     "pending",
        "updated_at": now,
        "emailed_at": None,   # reset if they came back and updated cart
    }, on_conflict="email").execute()
    return {"ok": True}


def _mark_abandoned_cart_completed(email: str) -> None:
    """Call this when an order is paid — suppresses recovery emails."""
    if not email:
        return
    try:
        supabase.table("abandoned_carts").update({
            "status":     "completed",
            "updated_at": now_iso(),
        }).eq("email", normalize_email(email)).in_("status", ["pending", "emailed"]).execute()
    except Exception:
        pass


def _send_abandoned_cart_email(entry: dict, site_url: str) -> bool:
    """Build and send the recovery email. Returns True on success."""
    email      = entry.get("email", "")
    first_name = entry.get("first_name") or "there"
    items      = entry.get("items_json") or []
    total      = entry.get("total_eur")

    if not items or not email:
        return False

    # Build item rows for the email
    item_rows_html = ""
    for item in items[:6]:  # cap at 6 items to keep email short
        name     = item.get("name", "")
        price    = float(item.get("price") or 0)
        qty      = int(item.get("quantity") or item.get("qty") or 1)
        size     = item.get("size") or ""
        img      = item.get("image_url") or ""
        slug     = item.get("slug") or str(item.get("id") or "")
        item_url = f"{site_url}/products/{slug}" if slug else site_url

        img_block = (
            f'<a href="{item_url}"><img src="{img}" width="64" height="64" '
            f'style="width:64px;height:64px;object-fit:cover;border-radius:8px;display:block;" alt="{name}"/></a>'
            if img else
            f'<div style="width:64px;height:64px;background:#f0f0ee;border-radius:8px;"></div>'
        )
        size_label = f' · {size}' if size else ''
        item_rows_html += f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0ee;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:14px;">{img_block}</td>
              <td style="vertical-align:top;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:500;color:#0a0a0a;">
                  <a href="{item_url}" style="color:#0a0a0a;text-decoration:none;">{name}</a>
                </p>
                <p style="margin:0;font-size:12px;color:#9b9b96;">x{qty}{size_label} · €{price:.2f}</p>
              </td>
            </tr></table>
          </td>
        </tr>"""

    total_line = f"<p style='margin:12px 0 0;font-size:15px;font-weight:700;color:#0a0a0a;'>Total: €{total:.2f}</p>" if total else ""
    cart_url   = f"{site_url}/cart"
    unsub_url  = f"{site_url}/unsubscribe?email={email}"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0a0a0a;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">EDM.CLOTHES</p>
        </td></tr>
        <tr><td style="padding:36px 40px 24px;">
          <p style="margin:0 0 6px;font-size:12px;color:#9b9b96;letter-spacing:0.1em;text-transform:uppercase;">You left something behind</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#0a0a0a;letter-spacing:-0.02em;">
            Hey {first_name}, your cart is waiting 🛒
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#6b6b66;line-height:1.6;">
            You got close! These items are still in your cart — but stock is limited, so grab them before they sell out.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            {item_rows_html}
          </table>
          {total_line}
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="{cart_url}"
               style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:16px 48px;border-radius:999px;">
              Complete my order →
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #ecece8;margin:0;"/></td></tr>
        <tr><td style="padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#b0b0a8;">
            © 2026 EDM Clothes · <a href="{site_url}" style="color:#b0b0a8;text-decoration:none;">edmclothes.net</a>
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:#c8c8c0;">
            You're receiving this because you started a checkout. <a href="{unsub_url}" style="color:#c8c8c0;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    text = (
        f"Hey {first_name}, you left something in your cart!\n\n"
        + "\n".join(
            f"- {i.get('name','')} x{i.get('quantity') or i.get('qty',1)}"
            + (f" · {i['size']}" if i.get('size') else "")
            + f" · €{float(i.get('price',0)):.2f}"
            for i in items[:6]
        )
        + (f"\n\nTotal: €{total:.2f}" if total else "")
        + f"\n\nComplete your order: {cart_url}\n\n"
        f"---\nTo unsubscribe: {unsub_url}"
    )

    subject = f"Hey {first_name}, you left something behind 👀"
    send_email(email, subject, html, text)
    return True


@app.post("/abandoned-cart/process", dependencies=[Depends(require_admin)])
def process_abandoned_carts(bg: BackgroundTasks):
    """
    Find carts that have been abandoned for ≥ 2 hours and haven't been emailed yet.
    Call this endpoint hourly via a cron service (cron-job.org or Render Cron Jobs).

    Example cron-job.org setup:
      URL: https://your-backend.onrender.com/abandoned-cart/process
      Method: POST
      Header: X-Admin-Secret: <your ADMIN_SECRET>
      Schedule: every hour
    """
    from datetime import datetime, timezone, timedelta

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    site_url = get_setting("site_url", "https://edmclothes.net")

    try:
        rows = (
            supabase.table("abandoned_carts")
            .select("*")
            .eq("status", "pending")
            .is_("emailed_at", "null")
            .lt("updated_at", cutoff)
            .execute()
            .data or []
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    sent = 0
    now  = now_iso()
    for row in rows:
        bg.add_task(_send_and_mark_cart, row, site_url, now)
        sent += 1

    return {"queued": sent}


def _send_and_mark_cart(entry: dict, site_url: str, now: str) -> None:
    """Background task: send email then update status."""
    ok = _send_abandoned_cart_email(entry, site_url)
    if ok:
        try:
            supabase.table("abandoned_carts").update({
                "status":     "emailed",
                "emailed_at": now,
                "updated_at": now,
            }).eq("id", entry["id"]).execute()
        except Exception:
            pass


# ── Wishlist (favourites) ─────────────────────────────────────────────────────
# IMPORTANT: static paths (/wishlist/products, /wishlist/notify-*)
# must be registered BEFORE the dynamic /wishlist/{product_id} route,
# otherwise FastAPI matches them as product_id and returns 422.

@app.get("/wishlist")
def get_wishlist(email: str = Query(...)):
    """Return all wishlisted product_ids for an email."""
    email = normalize_email(email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    rows = supabase.table("wishlists").select("product_id").eq("email", email).execute().data or []
    return [r["product_id"] for r in rows]


@app.get("/wishlist/products")
def get_wishlist_products(email: str = Query(...)):
    """Return full product details for all wishlisted items."""
    email = normalize_email(email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    rows = supabase.table("wishlists").select("product_id").eq("email", email).execute().data or []
    if not rows:
        return []
    ids = [r["product_id"] for r in rows]
    products = supabase.table("products").select("*").in_("id", ids).execute().data or []
    return [_decorate_product_with_images(p) for p in products]


def _send_wishlist_email(email: str, subject: str, html: str, text: str) -> None:
    send_email(email, subject, html, text)


def _wishlist_product_row_html(p: dict, site_url: str, badge: str = "") -> str:
    name  = p.get("name", "")
    price = float(p.get("price") or 0)
    cmp   = float(p.get("compare_price") or 0)
    slug  = p.get("slug") or str(p.get("id", ""))
    imgs  = p.get("image_urls") or []
    img   = (imgs[0] if imgs else None) or p.get("image_url") or ""
    url   = f"{site_url}/products/{slug}"

    price_html = f"€{price:.2f}"
    if cmp and cmp > price:
        pct = round((1 - price / cmp) * 100)
        price_html = (
            f'<span style="color:#ef4444;font-weight:700;">€{price:.2f}</span> '
            f'<span style="color:#aaa;text-decoration:line-through;font-size:12px;">€{cmp:.2f}</span> '
            f'<span style="color:#ef4444;font-size:11px;">−{pct}%</span>'
        )

    img_block = (
        f'<a href="{url}"><img src="{img}" width="72" height="72" '
        f'style="width:72px;height:72px;object-fit:cover;border-radius:10px;display:block;" alt="{name}"/></a>'
        if img else
        f'<div style="width:72px;height:72px;background:#f0f0ee;border-radius:10px;"></div>'
    )
    badge_html = f'<span style="background:#ef4444;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.06em;">{badge}</span>' if badge else ""

    return f"""
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0ee;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:16px;">{img_block}</td>
          <td style="vertical-align:top;">
            {badge_html}
            <p style="margin:{('4px' if badge else '0')} 0 4px;font-size:14px;font-weight:500;color:#0a0a0a;">
              <a href="{url}" style="color:#0a0a0a;text-decoration:none;">{name}</a>
            </p>
            <p style="margin:0;font-size:14px;">{price_html}</p>
          </td>
        </tr></table>
      </td>
    </tr>"""


def _build_wishlist_email(
    email: str, first_name: str, headline: str, subtext: str,
    products: list, site_url: str, badge: str = "",
) -> tuple[str, str]:
    rows_html = "".join(_wishlist_product_row_html(p, site_url, badge) for p in products[:5])
    unsub_url = f"{site_url}/unsubscribe?email={email}"
    wishlist_url = f"{site_url}/account?tab=wishlist"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0a0a0a;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">EDM.CLOTHES</p>
        </td></tr>
        <tr><td style="padding:36px 40px 24px;">
          <h1 style="margin:0 0 10px;font-size:22px;font-weight:600;color:#0a0a0a;letter-spacing:-0.02em;">{headline}</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#6b6b66;line-height:1.6;">{subtext}</p>
          <table width="100%" cellpadding="0" cellspacing="0">{rows_html}</table>
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="{wishlist_url}"
               style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:16px 48px;border-radius:999px;">
              View my wishlist →
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #ecece8;margin:0;"/></td></tr>
        <tr><td style="padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#b0b0a8;">
            © 2026 EDM Clothes · <a href="{site_url}" style="color:#b0b0a8;text-decoration:none;">edmclothes.net</a>
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:#c8c8c0;">
            You saved these items to your wishlist. <a href="{unsub_url}" style="color:#c8c8c0;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    text = f"{headline}\n\n{subtext}\n\n" + "\n".join(
        f"- {p.get('name','')} · €{float(p.get('price',0)):.2f}"
        for p in products[:5]
    ) + f"\n\nView wishlist: {wishlist_url}\n\nUnsubscribe: {unsub_url}"

    return html, text


@app.post("/wishlist/notify-low-stock", dependencies=[Depends(require_admin)])
def notify_wishlist_low_stock(bg: BackgroundTasks):
    """
    Notify wishlist owners when items have stock ≤ 3.
    Each (email, product) is notified at most ONCE — notified_low_stock_at is set
    and the entry is skipped on future runs until stock goes back up then low again.
    """
    from datetime import datetime, timezone
    site_url = get_setting("site_url", "https://edmclothes.net")

    try:
        low = (
            supabase.table("products")
            .select("id,name,slug,price,compare_price,image_url,image_urls,available_stock")
            .gt("available_stock", 0)
            .lte("available_stock", 3)
            .eq("is_hidden", False)
            .execute()
            .data or []
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not low:
        return {"notified": 0}

    low_ids = [p["id"] for p in low]
    low_map = {p["id"]: p for p in low}

    # Only entries not yet notified for low stock
    entries = (
        supabase.table("wishlists")
        .select("id,email,product_id")
        .in_("product_id", low_ids)
        .is_("notified_low_stock_at", "null")
        .execute()
        .data or []
    )
    if not entries:
        return {"notified": 0}

    from collections import defaultdict
    by_email: dict = defaultdict(list)
    entry_ids_by_email: dict = defaultdict(list)
    for e in entries:
        by_email[e["email"]].append(low_map[e["product_id"]])
        entry_ids_by_email[e["email"]].append(e["id"])

    now = datetime.now(timezone.utc).isoformat()
    sent = 0
    for email, products in by_email.items():
        html, text = _build_wishlist_email(
            email=email, first_name="there",
            headline="Your saved items are almost gone 🔥",
            subtext="Stock is running low on items you saved. Grab them before they sell out.",
            products=products, site_url=site_url, badge="Almost gone",
        )
        bg.add_task(_send_wishlist_email, email,
                    "Items in your wishlist are almost sold out", html, text)
        # Mark as notified so we don't send again
        supabase.table("wishlists").update({"notified_low_stock_at": now}) \
            .in_("id", entry_ids_by_email[email]).execute()
        sent += 1

    return {"notified": sent}


@app.post("/wishlist/notify-on-sale", dependencies=[Depends(require_admin)])
def notify_wishlist_on_sale(bg: BackgroundTasks):
    """
    Notify wishlist owners when items go on sale.
    Each (email, product) is notified at most ONCE per sale — notified_on_sale_at
    is set when emailed. Resets when compare_price is cleared (sale ends).
    """
    from datetime import datetime, timezone
    site_url = get_setting("site_url", "https://edmclothes.net")

    try:
        on_sale = (
            supabase.table("products")
            .select("id,name,slug,price,compare_price,image_url,image_urls,available_stock")
            .not_.is_("compare_price", "null")
            .gt("available_stock", 0)
            .eq("is_hidden", False)
            .execute()
            .data or []
        )
        on_sale = [p for p in on_sale if float(p.get("compare_price") or 0) > float(p.get("price") or 0)]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not on_sale:
        return {"notified": 0}

    sale_ids = [p["id"] for p in on_sale]
    sale_map = {p["id"]: p for p in on_sale}

    # Only entries not yet notified for this sale
    entries = (
        supabase.table("wishlists")
        .select("id,email,product_id")
        .in_("product_id", sale_ids)
        .is_("notified_on_sale_at", "null")
        .execute()
        .data or []
    )
    if not entries:
        return {"notified": 0}

    from collections import defaultdict
    by_email: dict = defaultdict(list)
    entry_ids_by_email: dict = defaultdict(list)
    for e in entries:
        by_email[e["email"]].append(sale_map[e["product_id"]])
        entry_ids_by_email[e["email"]].append(e["id"])

    now = datetime.now(timezone.utc).isoformat()
    sent = 0
    for email, products in by_email.items():
        html, text = _build_wishlist_email(
            email=email, first_name="there",
            headline="Your saved items are now on sale 🏷️",
            subtext="Good news — items you saved to your wishlist just went on sale. Don't miss out.",
            products=products, site_url=site_url, badge="On sale",
        )
        bg.add_task(_send_wishlist_email, email,
                    "Items in your wishlist are now on sale 🏷️", html, text)
        # Mark as notified
        supabase.table("wishlists").update({"notified_on_sale_at": now}) \
            .in_("id", entry_ids_by_email[email]).execute()
        sent += 1

    return {"notified": sent}


# Dynamic wishlist routes — registered LAST so static paths above take priority
@app.post("/wishlist/{product_id}")
def add_to_wishlist(product_id: int, email: str = Query(...)):
    """Add a product to the wishlist. Idempotent (upsert)."""
    email = normalize_email(email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    supabase.table("wishlists").upsert(
        {"email": email, "product_id": product_id},
        on_conflict="email,product_id",
    ).execute()
    return {"ok": True}


@app.delete("/wishlist/{product_id}")
def remove_from_wishlist(product_id: int, email: str = Query(...)):
    """Remove a product from the wishlist."""
    email = normalize_email(email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    supabase.table("wishlists").delete().eq("email", email).eq("product_id", product_id).execute()
    return {"ok": True}


# ── Resend email webhooks ──────────────────────────────────────────────────────

# Maps Resend event types → internal user_event event_type strings
_RESEND_EVENT_MAP = {
    "email.sent":      "email_sent",
    "email.delivered": "email_delivered",
    "email.opened":    "email_opened",
    "email.clicked":   "email_clicked",
    "email.bounced":   "email_bounced",
    "email.complained": "email_complained",  # spam complaint
}

@app.post("/webhooks/resend")
async def resend_webhook(request: Request):
    """
    Receives event webhooks from Resend and stores them in user_events.

    Set RESEND_WEBHOOK_SECRET in env vars, then register this URL in
    Resend dashboard → Webhooks → Add endpoint:
      https://your-backend.onrender.com/webhooks/resend
    Select events: email.sent, email.delivered, email.opened, email.clicked,
                   email.bounced, email.complained
    """
    import hmac, hashlib

    body = await request.body()

    # Verify Svix signature when secret is configured
    if RESEND_WEBHOOK_SECRET:
        import hmac as _hmac, hashlib as _hashlib, base64 as _base64

        svix_id        = request.headers.get("svix-id", "")
        svix_timestamp = request.headers.get("svix-timestamp", "")
        svix_signature = request.headers.get("svix-signature", "")

        # Svix secret is base64-encoded after the "whsec_" prefix
        raw_secret = RESEND_WEBHOOK_SECRET
        if raw_secret.startswith("whsec_"):
            raw_secret = raw_secret[len("whsec_"):]
        try:
            secret_bytes = _base64.b64decode(raw_secret)
        except Exception:
            secret_bytes = raw_secret.encode("utf-8")

        signed_content = f"{svix_id}.{svix_timestamp}.{body.decode('utf-8')}"
        expected = _hmac.new(secret_bytes, signed_content.encode(), _hashlib.sha256).digest()
        expected_b64 = _base64.b64encode(expected).decode()

        # svix-signature may contain multiple space-separated "v1,<sig>" values
        valid = any(
            sig.split(",", 1)[-1] == expected_b64
            for sig in svix_signature.split(" ")
            if "," in sig
        )
        if not valid:
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    resend_type = event.get("type", "")
    event_type  = _RESEND_EVENT_MAP.get(resend_type)
    if not event_type:
        return {"ok": True, "ignored": resend_type}

    data    = event.get("data") or {}
    email   = normalize_email(data.get("to") or "")
    tags    = data.get("tags") or {}          # Resend tags dict attached when sending
    subject = data.get("subject") or ""

    metadata = {
        "resend_email_id": data.get("email_id") or data.get("id") or "",
        "subject":         subject,
    }
    # Capture click URL if available
    if resend_type == "email.clicked":
        metadata["click_url"] = (data.get("click") or {}).get("link") or ""

    record_user_event(
        session_id=f"resend_{data.get('email_id') or data.get('id') or 'unknown'}",
        event_type=event_type,
        email=email or None,
        metadata=metadata,
    )
    return {"ok": True}