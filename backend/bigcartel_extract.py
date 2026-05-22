"""
Parse BigCartel orders CSV → produce customer list for Klaviyo + analytics.
Usage:
    python3 bigcartel_extract.py <path_to_csv>
    # default: ~/Downloads/orders-all-2026-05-16.csv
"""
import csv, sys, os
from collections import defaultdict, Counter
from datetime import datetime
from pathlib import Path

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else str(Path.home() / "Downloads/orders-all-2026-05-16.csv")
OUT_DIR  = Path.home() / "Desktop/clothing-store/exports"
OUT_DIR.mkdir(exist_ok=True)


def parse_items(raw: str):
    """'product_name:X|product_option_name:M|quantity:1|price:90|total:90' → list of dicts."""
    if not raw:
        return []
    items = []
    # multiple items separated by ' | ' ? BigCartel usually separates with newline or " | "
    # Each item is series of "key:value|key:value|..."
    # We split into groups by looking for "product_name:" markers
    parts = raw.split("product_name:")
    for p in parts[1:]:
        d = {"product_name": ""}
        first_pipe = p.find("|")
        if first_pipe == -1:
            d["product_name"] = p.strip()
        else:
            d["product_name"] = p[:first_pipe].strip()
            rest = p[first_pipe+1:]
            for kv in rest.split("|"):
                if ":" in kv:
                    k, v = kv.split(":", 1)
                    d[k.strip()] = v.strip()
        items.append(d)
    return items


def f(v, default=0.0):
    try: return float(v)
    except: return default


# ---------- read ----------
print(f"Reading {CSV_PATH}...")
rows = []
with open(CSV_PATH, "r", encoding="utf-8-sig") as fp:
    reader = csv.DictReader(fp)
    for r in reader:
        rows.append(r)
print(f"Loaded {len(rows)} orders\n")

# ---------- per-customer aggregation ----------
cust = defaultdict(lambda: {
    "first_name": "", "last_name": "", "phone": "", "country": "", "city": "",
    "orders": 0, "total_spent": 0.0, "items_count": 0,
    "first_order": None, "last_order": None,
    "products": Counter(),
})

# ---------- global aggregates ----------
monthly_rev = defaultdict(float)   # 'YYYY-MM' → revenue
monthly_orders = defaultdict(int)
country_rev = Counter()
country_orders = Counter()
product_qty = Counter()
product_rev = Counter()
discount_used = Counter()
all_revenue = 0.0
all_items_total = 0.0
all_shipping = 0.0
order_values = []

for r in rows:
    email = (r.get("Buyer email") or "").strip().lower()
    if not email:
        continue
    status = (r.get("Status") or "").strip().lower()
    pay    = (r.get("Payment status") or "").strip().lower()
    # Only count paid/completed orders for revenue
    if pay and pay != "completed":
        continue

    total = f(r.get("Total price"))
    items_total = f(r.get("Item total"))
    shipping = f(r.get("Total shipping"))
    date_str = (r.get("Date") or "").strip()
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
    except:
        d = None

    c = cust[email]
    c["first_name"] = (r.get("Buyer first name") or c["first_name"]).strip().title()
    c["last_name"]  = (r.get("Buyer last name")  or c["last_name"]).strip().title()
    c["phone"]      = (r.get("Buyer phone number") or c["phone"]).strip()
    c["country"]    = (r.get("Shipping country") or c["country"]).strip()
    c["city"]       = (r.get("Shipping city") or c["city"]).strip()
    c["orders"]    += 1
    c["total_spent"] += total
    c["items_count"] += int(f(r.get("Item count"), 0))
    if d:
        if c["first_order"] is None or d < c["first_order"]: c["first_order"] = d
        if c["last_order"]  is None or d > c["last_order"]:  c["last_order"]  = d

    items = parse_items(r.get("Items") or "")
    for it in items:
        name = it.get("product_name", "").strip()
        qty  = int(f(it.get("quantity", 1), 1))
        rev  = f(it.get("total", 0))
        if name:
            c["products"][name] += qty
            product_qty[name]   += qty
            product_rev[name]   += rev

    all_revenue   += total
    all_items_total += items_total
    all_shipping  += shipping
    order_values.append(total)
    if d:
        key = d.strftime("%Y-%m")
        monthly_rev[key] += total
        monthly_orders[key] += 1
    cc = c["country"]
    if cc:
        country_rev[cc]   += total
        country_orders[cc] += 1
    disc = (r.get("Discount code") or "").strip()
    if disc:
        discount_used[disc] += 1

# ---------- write customers_for_klaviyo.csv ----------
klaviyo_path = OUT_DIR / "customers_for_klaviyo.csv"
with open(klaviyo_path, "w", encoding="utf-8", newline="") as fp:
    w = csv.writer(fp)
    w.writerow([
        "email","first_name","last_name","phone","country","city",
        "total_orders","total_spent_eur","avg_order_value",
        "first_order_date","last_order_date","days_since_last_order",
        "top_product","customer_tier",
    ])
    today = datetime.utcnow()
    for email, c in cust.items():
        aov = (c["total_spent"]/c["orders"]) if c["orders"] else 0
        days_since = (today - c["last_order"]).days if c["last_order"] else ""
        top = c["products"].most_common(1)[0][0] if c["products"] else ""
        # Tier: VIP (>=3 orders OR >=300€) / Returning (2 orders) / One-time
        if c["orders"] >= 3 or c["total_spent"] >= 300:
            tier = "VIP"
        elif c["orders"] == 2:
            tier = "Returning"
        else:
            tier = "One-time"
        w.writerow([
            email, c["first_name"], c["last_name"], c["phone"], c["country"], c["city"],
            c["orders"], round(c["total_spent"],2), round(aov,2),
            c["first_order"].strftime("%Y-%m-%d") if c["first_order"] else "",
            c["last_order"].strftime("%Y-%m-%d")  if c["last_order"] else "",
            days_since, top, tier,
        ])
print(f"✓ {klaviyo_path}  ({len(cust)} unique customers)")

# ---------- analytics: monthly ----------
monthly_path = OUT_DIR / "analytics_monthly.csv"
with open(monthly_path, "w", encoding="utf-8", newline="") as fp:
    w = csv.writer(fp)
    w.writerow(["month","orders","revenue_eur","aov_eur"])
    for k in sorted(monthly_rev.keys()):
        n = monthly_orders[k]
        rev = monthly_rev[k]
        w.writerow([k, n, round(rev,2), round(rev/n,2) if n else 0])
print(f"✓ {monthly_path}")

# ---------- top products ----------
products_path = OUT_DIR / "analytics_products.csv"
with open(products_path, "w", encoding="utf-8", newline="") as fp:
    w = csv.writer(fp)
    w.writerow(["product","units_sold","revenue_eur"])
    for name, rev in sorted(product_rev.items(), key=lambda x: -x[1]):
        w.writerow([name, product_qty[name], round(rev,2)])
print(f"✓ {products_path}")

# ---------- countries ----------
countries_path = OUT_DIR / "analytics_countries.csv"
with open(countries_path, "w", encoding="utf-8", newline="") as fp:
    w = csv.writer(fp)
    w.writerow(["country","orders","revenue_eur"])
    for cc, rev in sorted(country_rev.items(), key=lambda x: -x[1]):
        w.writerow([cc, country_orders[cc], round(rev,2)])
print(f"✓ {countries_path}")

# ---------- summary ----------
summary_path = OUT_DIR / "analytics_summary.txt"
total_customers = len(cust)
repeat_customers = sum(1 for c in cust.values() if c["orders"] > 1)
vip = sum(1 for c in cust.values() if c["orders"] >= 3 or c["total_spent"] >= 300)
aov = (all_revenue / len(order_values)) if order_values else 0
ltv = (all_revenue / total_customers) if total_customers else 0
repeat_rate = (repeat_customers / total_customers * 100) if total_customers else 0
top10_products = product_rev.most_common(10) if hasattr(product_rev, 'most_common') else sorted(product_rev.items(), key=lambda x:-x[1])[:10]
top5_countries = sorted(country_rev.items(), key=lambda x:-x[1])[:5]

lines = [
    "=" * 50,
    "BIGCARTEL ORDERS — MARKETING SUMMARY",
    "=" * 50,
    f"Total orders (paid):      {len(order_values)}",
    f"Total revenue:            €{all_revenue:,.2f}",
    f"Avg order value (AOV):    €{aov:.2f}",
    f"Total customers:          {total_customers}",
    f"Customer LTV (avg):       €{ltv:.2f}",
    f"Repeat customers:         {repeat_customers} ({repeat_rate:.1f}%)",
    f"VIP customers (3+/€300+): {vip}",
    "",
    "TOP 10 PRODUCTS BY REVENUE:",
]
for name, rev in top10_products:
    lines.append(f"  €{rev:>8.2f}  {product_qty[name]:>3} units  {name}")
lines += ["", "TOP 5 COUNTRIES BY REVENUE:"]
for cc, rev in top5_countries:
    lines.append(f"  €{rev:>8.2f}  {country_orders[cc]:>3} orders  {cc}")

with open(summary_path, "w", encoding="utf-8") as fp:
    fp.write("\n".join(lines))

print(f"✓ {summary_path}\n")
print("\n".join(lines))
print(f"\nAll files saved to: {OUT_DIR}")
