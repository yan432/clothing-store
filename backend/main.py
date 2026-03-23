from datetime import datetime, timezone
import os
import random
import string
from urllib.parse import unquote, urlparse
import uuid
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
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
        "http://localhost:3000"
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
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "STORE <orders@store.local>")
ORDER_ALERT_EMAIL = os.getenv("ORDER_ALERT_EMAIL")


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


def extract_shipping_fields(session_obj: dict) -> dict:
    shipping = as_dict(session_obj.get("shipping_details"))
    address = as_dict(shipping.get("address"))
    customer = as_dict(session_obj.get("customer_details"))
    return {
        "phone": customer.get("phone"),
        "shipping_name": shipping.get("name"),
        "shipping_line1": address.get("line1"),
        "shipping_line2": address.get("line2"),
        "shipping_city": address.get("city"),
        "shipping_state": address.get("state"),
        "shipping_postal_code": address.get("postal_code"),
        "shipping_country": address.get("country"),
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


def send_resend_email(to_email: str, subject: str, html: str, text: str) -> None:
    if not RESEND_API_KEY:
        print("Resend is not configured: RESEND_API_KEY is missing")
        return
    target = str(to_email or "").strip()
    if not target:
        return
    try:
        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": RESEND_FROM_EMAIL,
                "to": [target],
                "subject": subject,
                "html": html,
                "text": text,
            },
            timeout=8,
        )
        if response.status_code >= 400:
            print(f"Resend email failed ({response.status_code}): {response.text[:300]}")
    except requests.RequestException as exc:
        # Email delivery failure should not block order flow/webhook processing.
        print(f"Resend email request error: {exc}")
        return


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

    items_html = order_items_html(items)
    items_text = order_items_text(items)
    promo_row_html = ""
    promo_row_text = ""
    if promo_discount > 0:
        promo_row_html = f"<tr><td style='padding:4px 0'>Discount</td><td></td><td style='text-align:right'>-{money_eur(promo_discount)}</td></tr>"
        promo_row_text = f"Discount: -{money_eur(promo_discount)}\n"

    customer_subject = f"Order confirmation #{order_id} — STORE"
    customer_html = f"""
      <div style="font-family:Arial,sans-serif;color:#111">
        <h2>Thanks for your order, {customer_name}!</h2>
        <p>We received your order and started processing it.</p>
        <p><strong>Order #{order_id}</strong><br/>Reference: {order_ref or '-'}</p>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Total</th></tr></thead>
          <tbody>{items_html}</tbody>
        </table>
        <hr/>
        <table style="width:100%">
          <tr><td>Subtotal</td><td align="right">{money_eur(subtotal)}</td></tr>
          {promo_row_html}
          <tr><td>Shipping</td><td align="right">{money_eur(shipping)}</td></tr>
          <tr><td><strong>Total</strong></td><td align="right"><strong>{money_eur(total)}</strong></td></tr>
        </table>
        <p style="margin-top:14px"><strong>Shipping address:</strong><br/>{shipping_address or 'Not provided'}</p>
      </div>
    """
    customer_text = (
        f"Thanks for your order, {customer_name}!\n\n"
        f"Order #{order_id}\nReference: {order_ref or '-'}\n\n"
        f"{items_text}\n\n"
        f"Subtotal: {money_eur(subtotal)}\n"
        f"{promo_row_text}"
        f"Shipping: {money_eur(shipping)}\n"
        f"Total: {money_eur(total)}\n\n"
        f"Shipping address: {shipping_address or 'Not provided'}\n"
    )
    send_resend_email(customer_email, customer_subject, customer_html, customer_text)

    admin_target = str(ORDER_ALERT_EMAIL or "").strip()
    if admin_target:
        admin_subject = f"New paid order #{order_id} — {money_eur(total)}"
        admin_html = f"""
          <div style="font-family:Arial,sans-serif;color:#111">
            <h2>New paid order received</h2>
            <p><strong>Order #{order_id}</strong><br/>Reference: {order_ref or '-'}</p>
            <p><strong>Customer email:</strong> {customer_email or '-'}</p>
            <p><strong>Shipping:</strong> {shipping_address or 'Not provided'}</p>
            <table style="width:100%;border-collapse:collapse">
              <thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Total</th></tr></thead>
              <tbody>{items_html}</tbody>
            </table>
            <hr/>
            <p><strong>Total:</strong> {money_eur(total)}</p>
          </div>
        """
        admin_text = (
            f"New paid order received\n\n"
            f"Order #{order_id}\nReference: {order_ref or '-'}\n"
            f"Customer email: {customer_email or '-'}\n"
            f"Shipping: {shipping_address or 'Not provided'}\n\n"
            f"{items_text}\n\n"
            f"Total: {money_eur(total)}\n"
        )
        send_resend_email(admin_target, admin_subject, admin_html, admin_text)


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
    image_urls = _storage_public_urls_for_product(product["id"])
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
    return [
        {
            **p,
            **stock_snapshot_for_product(p),
            "tags": compute_auto_tags(p),
            "compare_price": p.get("compare_price"),
            "discount_percent": compute_discount_percent(p.get("price"), p.get("compare_price")),
        }
        for p in products
    ]


@app.get("/products/admin")
def get_products_admin():
    data = supabase.table("products").select("*").order("id").execute()
    # Fast admin listing: avoid per-product storage listing.
    return [{**p, **stock_snapshot_for_product(p)} for p in data.data]


@app.get("/products/{product_id}")
def get_product(product_id: int):
    return _decorate_product_with_images(get_visible_product_row(product_id))


@app.get("/products/admin/{product_id}")
def get_product_admin(product_id: int):
    return _decorate_product_with_images(get_product_row(product_id))


@app.post("/products")
def create_product(product: Product):
    payload = product.dict()
    # ... твоя логика остатков ...
    
    # Перед вставкой в базу, один раз вызываем сканирование папки
    # (для одного товара при создании это не затормозит систему)
    temp_id = str(uuid.uuid4()) # или используй логику получения ID после вставки
    
    # Вставляем запись
    data = supabase.table("products").insert(payload).execute()
    new_product = data.data[0]
    
    # Опционально: после вставки можно обновить image_urls, 
    # если ты уже загрузил файлы в Storage в папку с ID товара
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

    cover = uploaded_urls[0]
    data = supabase.table("products").update({"image_url": cover}).eq("id", product_id).execute()
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
    updated = _decorate_product_with_images(product)
    next_cover = updated["image_urls"][0] if updated["image_urls"] else None
    data = supabase.table("products").update({"image_url": next_cover}).eq("id", product_id).execute()
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

@app.post("/checkout")
def create_checkout(request: CheckoutRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    normalized_items = []
    subtotal = 0.0
    line_items = []

    for item in request.items:
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
    normalized_promo_code = normalize_promo_code(request.promo_code)
    if normalized_promo_code:
        promo = get_active_promo_row(normalized_promo_code)
        if not promo:
            raise HTTPException(status_code=400, detail="Promo code is invalid or expired")
        promo_type = str(promo.get("discount_type") or "").lower()
        promo_discount = promo_discount_amount(subtotal, promo, SHIPPING_COST)
        if promo_discount <= 0:
            raise HTTPException(status_code=400, detail="Promo code does not apply")

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

        order_insert = supabase.table("orders").insert({
            "client_reference_id": client_reference_id,
            "status": ORDER_PENDING,
            "currency": "eur",
            "amount_total": round(amount_total, 2),
            "items_json": normalized_items,
            "metadata_json": metadata_json,
            "email": request.customer_email,
            "phone": request.phone,
            "shipping_name": f"{request.first_name or ''} {request.last_name or ''}".strip(),
            "shipping_line1": request.address,
            "shipping_city": request.city,
            "shipping_postal_code": request.zip,
            "shipping_country": request.country,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }).execute()
        if not order_insert.data:
            raise HTTPException(status_code=500, detail="Failed to create order")
        created_order = order_insert.data[0]

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

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            client_reference_id=client_reference_id,
            discounts=stripe_discounts,
            billing_address_collection="required",
            shipping_address_collection={
                "allowed_countries": [
                    "US", "CA", "GB", "DE", "FR", "ES", "IT", "NL", "BE", "PL", "PT",
                    "SE", "NO", "DK", "FI", "IE", "AT", "CH", "CZ"
                ]
            },
            phone_number_collection={"enabled": True},
            customer_email=request.customer_email,
            metadata={
                "client_reference_id": client_reference_id,
                "order_id": str(created_order.get("id")),
                "promo_code": str(promo.get("code")) if promo else "",
            },
            success_url=request.success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=request.cancel_url,
        )
        session_dict = stripe_obj_to_dict(session)
        expires_at_epoch = session_dict.get("expires_at")
        expires_at_iso = None
        if expires_at_epoch:
            expires_at_iso = datetime.fromtimestamp(expires_at_epoch, tz=timezone.utc).isoformat()

        supabase.table("orders").update({
            "stripe_session_id": session.id,
            "stripe_payment_intent_id": session_dict.get("payment_intent"),
            "stripe_customer_id": session_dict.get("customer"),
            "session_json": session_dict,
            "email": as_dict(session_dict.get("customer_details")).get("email") or request.customer_email,
            **extract_shipping_fields(session_dict),
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
        **extract_shipping_fields(data_obj),
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
    return {"received": True}


@app.get("/orders")
def list_orders():
    data = supabase.table("orders").select("*").order("created_at", desc=True).limit(100).execute()
    return data.data


@app.get("/orders/{id_or_session}")
def get_order(id_or_session: str):
    result = supabase.table("orders").select("*").eq("stripe_session_id", id_or_session).limit(1).execute()
    if result.data:
        return result.data[0]

    result = supabase.table("orders").select("*").eq("client_reference_id", id_or_session).limit(1).execute()
    if result.data:
        return result.data[0]

    if id_or_session.isdigit():
        result = supabase.table("orders").select("*").eq("id", int(id_or_session)).limit(1).execute()
        if result.data:
            return result.data[0]

    raise HTTPException(status_code=404, detail="Order not found")