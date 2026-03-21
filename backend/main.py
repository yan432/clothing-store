from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
import os
import uuid
from fastapi import UploadFile, File

load_dotenv()
app = FastAPI(title="Clothing Store API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://project-e38lc.vercel.app",
        "http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

class Product(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    category: Optional[str] = None
    stock: int = 0


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


def _decorate_product_with_images(product: dict) -> dict:
    image_urls = _storage_public_urls_for_product(product["id"])
    legacy_cover = product.get("image_url")
    if legacy_cover and legacy_cover not in image_urls:
        image_urls = [legacy_cover, *image_urls]
    cover = image_urls[0] if image_urls else legacy_cover
    return {**product, "image_url": cover, "image_urls": image_urls}

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/products")
def get_products():
    data = supabase.table("products").select("*").execute()
    return [_decorate_product_with_images(p) for p in data.data]

@app.get("/products/{product_id}")
def get_product(product_id: int):
    data = supabase.table("products").select("*").eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return _decorate_product_with_images(data.data[0])

@app.post("/products")
def create_product(product: Product):
    data = supabase.table("products").insert(product.dict()).execute()
    return data.data[0]

@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    supabase.table("products").delete().eq("id", product_id).execute()
    return {"message": "Удалён"}
@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    content = await file.read()
    
    result = supabase.storage.from_("product-images").upload(
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

    # Keep compatibility with existing schema by storing cover in image_url.
    cover = uploaded_urls[0]
    data = supabase.table("products").update({"image_url": cover}).eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return _decorate_product_with_images(data.data[0])
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class CheckoutItem(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    image_url: Optional[str] = None

class CheckoutRequest(BaseModel):
    items: list[CheckoutItem]
    success_url: str = "https://project-e38lc.vercel.app/success"
    cancel_url: str = "https://project-e38lc.vercel.app/cart"

@app.post("/checkout")
def create_checkout(request: CheckoutRequest):
    line_items = []
    for item in request.items:
        print(f"Item: {item.name}, price: {item.price}, qty: {item.quantity}, amount: {int(item.price * 100)}")
        line_items.append({
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": item.name,
                    "images": [item.image_url] if item.image_url else [],
                },
                "unit_amount": max(1, int(item.price * 100)),
            },
            "quantity": max(1, item.quantity),
        })
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=line_items,
        mode="payment",
        success_url=request.success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=request.cancel_url,
    )
    return {"url": session.url}