from datetime import datetime, timezone
import os
from urllib.parse import unquote, urlparse
import uuid
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import stripe
from supabase import Client, create_client

load_dotenv()
app = FastAPI(title="Clothing Store API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://project-e38lc.vercel.app",
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


class Product(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    category: Optional[str] = None
    stock: int = 0
    available_stock: Optional[int] = None
    reserved_stock: Optional[int] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    available_stock: Optional[int] = None
    reserved_stock: Optional[int] = None


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
    success_url: str = "https://project-e38lc.vercel.app/success"
    cancel_url: str = "https://project-e38lc.vercel.app/cart"
    customer_email: Optional[str] = None


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


def get_product_row(product_id: int) -> dict:
    data = supabase.table("products").select("*").eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
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
    }


def reserve_stock(items: list[dict]) -> None:
    products_map: dict[int, dict] = {}
    for item in items:
        product = get_product_row(int(item["id"]))
        available = get_available_stock_value(product)
        if available < int(item["quantity"]):
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for product {item['id']}",
            )
        products_map[int(item["id"])] = product

    for item in items:
        product = products_map[int(item["id"])]
        qty = int(item["quantity"])
        available = get_available_stock_value(product)
        reserved = get_reserved_stock_value(product)
        supabase.table("products").update({
            "available_stock": available - qty,
            "reserved_stock": reserved + qty,
            "stock": available - qty,
        }).eq("id", int(item["id"])).execute()


def release_reserved_stock(items: list[dict]) -> None:
    for item in items:
        product = get_product_row(int(item["id"]))
        qty = int(item["quantity"])
        available = get_available_stock_value(product)
        reserved = get_reserved_stock_value(product)
        new_reserved = max(0, reserved - qty)
        returned = reserved - new_reserved
        supabase.table("products").update({
            "available_stock": available + returned,
            "reserved_stock": new_reserved,
            "stock": available + returned,
        }).eq("id", int(item["id"])).execute()


def finalize_paid_stock(items: list[dict]) -> None:
    for item in items:
        product = get_product_row(int(item["id"]))
        qty = int(item["quantity"])
        reserved = get_reserved_stock_value(product)
        new_reserved = max(0, reserved - qty)
        supabase.table("products").update({
            "reserved_stock": new_reserved,
            "stock": get_available_stock_value(product),
        }).eq("id", int(item["id"])).execute()


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
    data = supabase.table("products").select("*").execute()
    return [_decorate_product_with_images(p) for p in data.data]


@app.get("/products/admin")
def get_products_admin():
    data = supabase.table("products").select("*").order("id").execute()
    # Fast admin listing: avoid per-product storage listing.
    return [{**p, **stock_snapshot_for_product(p)} for p in data.data]


@app.get("/products/{product_id}")
def get_product(product_id: int):
    data = supabase.table("products").select("*").eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return _decorate_product_with_images(data.data[0])


@app.post("/products")
def create_product(product: Product):
    payload = product.dict()
    if payload.get("available_stock") is None:
        payload["available_stock"] = payload.get("stock", 0)
    if payload.get("reserved_stock") is None:
        payload["reserved_stock"] = 0
    payload["stock"] = payload["available_stock"]
    data = supabase.table("products").insert(payload).execute()
    return data.data[0]


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


@app.post("/checkout")
def create_checkout(request: CheckoutRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    normalized_items = []
    amount_total = 0.0
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
        amount_total += price * qty
        line_items.append({
            "price_data": {
                "currency": "usd",
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

    reserve_stock(normalized_items)
    client_reference_id = str(uuid.uuid4())
    created_order = None

    try:
        order_insert = supabase.table("orders").insert({
            "client_reference_id": client_reference_id,
            "status": ORDER_PENDING,
            "currency": "usd",
            "amount_total": round(amount_total, 2),
            "items_json": normalized_items,
            "metadata_json": {"source": "web_checkout"},
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }).execute()
        if not order_insert.data:
            raise HTTPException(status_code=500, detail="Failed to create order")
        created_order = order_insert.data[0]

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            client_reference_id=client_reference_id,
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
            "email": as_dict(session_dict.get("customer_details")).get("email"),
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
                "event_json": {"error": str(exc)},
            }).eq("id", created_order["id"]).execute()
        raise HTTPException(status_code=500, detail=f"Checkout creation failed: {exc}")


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