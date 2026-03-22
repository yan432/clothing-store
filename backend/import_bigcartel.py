import requests
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

BIGCARTEL_SLUG = "edmclothes"  # замени если нужно

STATUS_MAP = {
    "active": False,
    "sold-out": False,
    "coming-soon": True,
}

def import_products():
    url = f"https://api.bigcartel.com/{BIGCARTEL_SLUG}/products.json"
    res = requests.get(url)
    products = res.json()
    print(f"Found {len(products)} products")

    for p in products:
        name = p["name"].strip()
        description = p.get("description", "").strip()
        price = float(p["price"])
        status = p.get("status", "active")
        is_hidden = STATUS_MAP.get(status, False)
        category = p["categories"][0]["name"] if p.get("categories") else "Uncategorized"
        images = [img["secure_url"] for img in p.get("images", [])]
        cover = images[0] if images else None
        sizes = [opt["name"] for opt in p.get("options", [])]
        stock = len(sizes) * 5  # временно 5 единиц каждого размера

        print(f"Importing: {name} ({status})")

        data = supabase.table("products").insert({
            "name": name,
            "description": description,
            "price": price,
            "category": category,
            "image_url": cover,
            "stock": stock,
            "available_stock": stock,
            "reserved_stock": 0,
            "is_hidden": is_hidden,
        }).execute()

        product_id = data.data[0]["id"]

        # Загружаем фото в Supabase Storage
        for i, img_url in enumerate(images):
            try:
                img_data = requests.get(img_url).content
                ext = img_url.split(".")[-1].split("?")[0] or "jpg"
                path = f"{product_id}/{i}.{ext}"
                supabase.storage.from_("product-images").upload(
                    path, img_data, {"content-type": f"image/{ext}"}
                )
                print(f"  Uploaded image {i+1}/{len(images)}")

                if i == 0:
                    public_url = supabase.storage.from_("product-images").get_public_url(path)
                    supabase.table("products").update({
                        "image_url": public_url
                    }).eq("id", product_id).execute()
            except Exception as e:
                print(f"  Image error: {e}")

        # Сохраняем размеры в описание если есть
        if sizes:
            sizes_str = " / ".join(sizes)
            print(f"  Sizes: {sizes_str}")

        print(f"  Done: ID={product_id}")

    print("\nImport complete!")

if __name__ == "__main__":
    import_products()