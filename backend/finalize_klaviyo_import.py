"""Take customers_for_klaviyo.csv and produce a Klaviyo-ready file:
   - phone → phone_number (Klaviyo's expected field name)
   - normalize phones (remove spaces/brackets, ensure E.164)
   - drop rows with no email (Klaviyo requires email as identifier)
"""
import csv, re
from pathlib import Path

SRC = Path.home() / "Desktop/clothing-store/exports/customers_for_klaviyo.csv"
DST = Path.home() / "Desktop/clothing-store/exports/klaviyo_bigcartel_audience.csv"

def normalize_phone(s: str) -> str:
    if not s: return ""
    s = s.strip()
    has_plus = s.startswith("+")
    digits = re.sub(r"\D", "", s)
    if not digits: return ""
    if has_plus:
        return "+" + digits
    # UA heuristics
    if digits.startswith("380") and len(digits) == 12:
        return "+" + digits
    if digits.startswith("0") and len(digits) == 10:
        return "+38" + digits
    return "+" + digits

with open(SRC, "r", encoding="utf-8") as fp:
    rows = list(csv.DictReader(fp))

print(f"Input: {len(rows)} customers")

OUT_FIELDS = [
    "email", "first_name", "last_name", "phone_number",
    "country", "city",
    "total_orders", "total_spent_eur", "avg_order_value",
    "first_order_date", "last_order_date", "days_since_last_order",
    "top_product", "customer_tier",
    "source",
]

dropped_no_email = 0
written = 0
with open(DST, "w", encoding="utf-8", newline="") as fp:
    w = csv.DictWriter(fp, fieldnames=OUT_FIELDS)
    w.writeheader()
    for r in rows:
        email = (r.get("email") or "").strip().lower()
        if not email or "@" not in email:
            dropped_no_email += 1
            continue
        out = {
            "email": email,
            "first_name": (r.get("first_name") or "").strip(),
            "last_name":  (r.get("last_name") or "").strip(),
            "phone_number": normalize_phone(r.get("phone") or ""),
            "country": (r.get("country") or "").strip(),
            "city":    (r.get("city") or "").strip(),
            "total_orders":     r.get("total_orders") or "",
            "total_spent_eur":  r.get("total_spent_eur") or "",
            "avg_order_value":  r.get("avg_order_value") or "",
            "first_order_date": r.get("first_order_date") or "",
            "last_order_date":  r.get("last_order_date") or "",
            "days_since_last_order": r.get("days_since_last_order") or "",
            "top_product":   r.get("top_product") or "",
            "customer_tier": r.get("customer_tier") or "",
            "source": "bigcartel",
        }
        w.writerow(out)
        written += 1

print(f"Written: {written} rows → {DST}")
print(f"Dropped (no email): {dropped_no_email}")
