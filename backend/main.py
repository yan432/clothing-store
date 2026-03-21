from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
import os

load_dotenv()
app = FastAPI(title="Clothing Store API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/products")
def get_products():
    data = supabase.table("products").select("*").execute()
    return data.data

@app.get("/products/{product_id}")
def get_product(product_id: int):
    data = supabase.table("products").select("*").eq("id", product_id).execute()
    if not data.data:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return data.data[0]

@app.post("/products")
def create_product(product: Product):
    data = supabase.table("products").insert(product.dict()).execute()
    return data.data[0]

@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    supabase.table("products").delete().eq("id", product_id).execute()
    return {"message": "Удалён"}
from fastapi import UploadFile, File
import uuid

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
async def update_product_image(product_id: int, file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    content = await file.read()
    
    supabase.storage.from_("product-images").upload(
        filename,
        content,
        {"content-type": file.content_type}
    )
    
    url = supabase.storage.from_("product-images").get_public_url(filename)
    data = supabase.table("products").update({"image_url": url}).eq("id", product_id).execute()
    return data.data[0]    
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
    success_url: str = "http://localhost:3000/success"
    cancel_url: str = "http://localhost:3000/cart"

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