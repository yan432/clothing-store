"""
Classify and standardize messy orders CSV into 4 outputs:
  - clean_customers.csv     (formats A, B, E)
  - b2b_orders.csv          (showroom / shop / barter)
  - multi_customer_review.csv (multi-customer rows for manual fix)
  - orphans.csv             (everything else)

Usage:
    python3 standardize_orders.py [path_to_csv]
"""
import csv, sys, re, json
from collections import Counter
from pathlib import Path

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else str(Path.home() / "Downloads/Orders - Tabellenblatt1.csv")
OUT_DIR  = Path.home() / "Desktop/clothing-store/exports"
OUT_DIR.mkdir(exist_ok=True)

# ---------- regex helpers ----------
EMAIL_RE   = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE   = re.compile(r"(?:\+?\d[\d\s\-()]{7,}\d)")
DATE_FULL_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?\b")
B2B_TOKENS = re.compile(r"шоурум|шоу-?рум|showroom|магазин|бартер", re.IGNORECASE)
COUNTRY_TOKENS = re.compile(
    r"\b(Germany|Lithuania|Spain|Slovakia|Poland|Polska|Czech|Czechia|Italy|"
    r"France|Belgium|Netherlands|UK|United Kingdom|Austria|Romania|Hungary|"
    r"Slovenia|Sweden|Denmark|Finland|Norway|Estonia|Latvia|Portugal|Greece|"
    r"Ireland|Switzerland|Croatia)\b", re.IGNORECASE,
)

def normalize_phone(s: str) -> str:
    """Extract digits, normalize to +XXX..."""
    if not s: return ""
    digits = re.sub(r"\D", "", s)
    if not digits: return ""
    # UA heuristics:
    if digits.startswith("380") and len(digits) == 12:
        return "+" + digits
    if digits.startswith("0") and len(digits) == 10:
        return "+38" + digits  # 0XXXXXXXXX → +380XXXXXXXXX
    if len(digits) == 9 and digits[0] in "5679":
        # UA mobile prefix without leading 0: e.g. 959226620 → +380959226620
        return "+380" + digits
    # Plus sign already present in source → trust it
    if s.strip().startswith("+"):
        return "+" + digits
    # Otherwise prepend +
    return "+" + digits

def split_full_name(full: str) -> tuple:
    """ФИО → (first_name, last_name) best-effort."""
    if not full: return ("", "")
    parts = full.strip().split()
    if len(parts) == 0: return ("", "")
    if len(parts) == 1: return (parts[0].title(), "")
    # In Russian/Ukrainian common format is "Фамилия Имя Отчество" OR "Имя Фамилия"
    # We can't reliably tell. Default: first word = first_name (Latin/Western convention)
    return (parts[0].title(), " ".join(parts[1:]).title())

def parse_total(s: str) -> tuple:
    """Return (amount: float|None, currency: str, note: str)."""
    if not s: return (None, "", "")
    s = str(s).strip()
    low = s.lower()
    if any(t in low for t in ("шоурум", "магазин", "бартер")):
        return (None, "", s)
    # extract first number (allow . and ,)
    m = re.search(r"\d+[.,]?\d*", s.replace(" ", ""))
    if not m: return (None, "", s)
    num = m.group(0).replace(",", ".")
    try:
        amount = float(num)
    except: amount = None
    cur = ""
    if "грн" in low or "uah" in low: cur = "UAH"
    elif "€" in s or "eur" in low: cur = "EUR"
    elif "$" in s or "usd" in low: cur = "USD"
    return (amount, cur, "")

def classify(row: dict) -> str:
    """Return one of: D, B, C, E, A, orphan."""
    all_text = " | ".join(str(row.get(k) or "") for k in row).strip()
    if not all_text:
        return "orphan"
    if B2B_TOKENS.search(all_text):
        return "D"
    if EMAIL_RE.search(all_text):
        return "B"
    if COUNTRY_TOKENS.search(all_text):
        return "B"
    if DATE_FULL_RE.search(all_text):
        return "B"
    name_cell = (row.get("ФИО") or "")
    phone_cell = (row.get("Номер телефона") or "")
    # Newlines in cells: distinguish F (one customer, \n-separated fields)
    # from C (truly multiple customers — multiple distinct phones).
    combined = name_cell + "\n" + phone_cell
    if "\n" in combined:
        phones_found = PHONE_RE.findall(combined)
        # Deduplicate by digits-only to avoid counting same phone twice
        unique_phones = {re.sub(r"\D", "", p) for p in phones_found if re.sub(r"\D", "", p)}
        if len(unique_phones) >= 2:
            return "C"  # multiple distinct phones → real multi-customer
        # Otherwise: single customer in slammed-with-newlines format
        return "F"
    # Format E: slammed RU/UA — ФИО contains comma + digit (phone) + cyrillic
    if "," in name_cell and re.search(r"\d", name_cell) and re.search(r"[а-яА-ЯіїєґІЇЄҐ]", name_cell):
        return "E"
    # Format A: at least name and one of (phone/address)
    if name_cell.strip() and (phone_cell.strip() or (row.get("Адрес") or "").strip()):
        return "A"
    return "orphan"

# ---------- B-format parser (international, slammed in ФИО) ----------
def parse_format_b(row: dict) -> dict:
    """Extract structured fields. Handles both slammed-in-ФИО and clean-split formats."""
    raw_name  = (row.get("ФИО") or "").strip().strip('"')
    raw_addr  = (row.get("Адрес") or "").strip().strip('"')
    raw_phone = (row.get("Номер телефона") or "").strip()
    all_text = " | ".join(str(row.get(k) or "") for k in row)
    email_m = EMAIL_RE.search(all_text)
    email = email_m.group(0).lower() if email_m else ""

    # Slammed format: ФИО contains a phone or 2+ commas
    slammed = bool(PHONE_RE.search(raw_name)) or raw_name.count(",") >= 2

    if slammed:
        phone_m = PHONE_RE.search(raw_name)
        phone = normalize_phone(phone_m.group(0)) if phone_m else normalize_phone(raw_phone)
        cleaned = raw_name
        if email: cleaned = cleaned.replace(email, "")
        if phone_m: cleaned = cleaned.replace(phone_m.group(0), "")
        parts = [p.strip() for p in cleaned.split(",") if p.strip()]
    else:
        phone = normalize_phone(raw_phone)
        parts = [raw_name] + [p.strip() for p in raw_addr.split(",") if p.strip()]
    # heuristics:
    # parts[0] = name
    # find country
    country = ""
    city = ""
    for p in parts:
        cm = COUNTRY_TOKENS.search(p)
        if cm:
            country = cm.group(0).title()
            # likely "City ZIP" before country
            idx = parts.index(p)
            if idx > 0:
                city_zip = parts[idx-1]
                city = re.sub(r"\d", "", city_zip).strip()
            break
    name = parts[0] if parts else ""
    first_name, last_name = split_full_name(name)
    return {
        "first_name": first_name, "last_name": last_name,
        "email": email, "phone": phone,
        "country": country, "city": city,
    }

# ---------- E-format parser (RU/UA slammed in ФИО) ----------
def parse_format_e(row: dict) -> dict:
    raw = (row.get("ФИО") or "").strip().strip('"')
    phone_m = PHONE_RE.search(raw)
    phone = normalize_phone(phone_m.group(0)) if phone_m else normalize_phone(row.get("Номер телефона") or "")
    cleaned = raw
    if phone_m: cleaned = cleaned.replace(phone_m.group(0), "")
    parts = [p.strip() for p in cleaned.split(",") if p.strip()]
    name = parts[0] if parts else ""
    first_name, last_name = split_full_name(name)
    # city is usually 2nd part
    city = parts[1] if len(parts) > 1 else ""
    return {
        "first_name": first_name, "last_name": last_name,
        "email": "", "phone": phone,
        "country": "UA", "city": city,
    }

# ---------- F-format parser (RU/UA slammed with \n separators) ----------
def parse_format_f(row: dict) -> dict:
    name_cell  = (row.get("ФИО") or "").strip().strip('"')
    phone_cell = (row.get("Номер телефона") or "").strip().strip('"')
    combined = (name_cell + "\n" + phone_cell).strip()
    parts = [p.strip() for p in combined.split("\n") if p.strip()]
    # find phone anywhere
    phone = ""
    name_parts = []
    city = ""
    for p in parts:
        if PHONE_RE.search(p):
            if not phone:
                phone = normalize_phone(PHONE_RE.search(p).group(0))
            continue
        # Heuristic: lines containing "Поштомат", "відділення", "нп", postal markers → address
        if re.search(r"поштомат|відділення|відд\.|нова пошта|нп\b|поштамат|укрпошта|адрес|вулиця|улиц|г\.|м\.|ул\.|просп", p, re.IGNORECASE):
            if not city:
                # take first meaningful word as city hint
                m = re.search(r"(м\.|г\.)\s*([А-ЯҐЇЄІа-яґїєі\-]+)", p)
                if m: city = m.group(2)
            continue
        # otherwise — likely a name fragment
        name_parts.append(p)
    full_name = " ".join(name_parts).strip()
    first_name, last_name = split_full_name(full_name)
    # fallback address from "Адрес" column
    if not city:
        addr = re.sub(r"\s+", " ", (row.get("Адрес") or "").replace("\n", " ")).strip()
        city = addr.split(",")[0].strip() if addr else ""
    return {
        "first_name": first_name, "last_name": last_name,
        "email": "", "phone": phone,
        "country": "UA", "city": city,
    }


# ---------- A-format parser (clean split columns) ----------
def parse_format_a(row: dict) -> dict:
    full = re.sub(r"\s+", " ", (row.get("ФИО") or "").replace("\n", " ")).strip().strip('"')
    first_name, last_name = split_full_name(full)
    phone = normalize_phone(row.get("Номер телефона") or "")
    addr = re.sub(r"\s+", " ", (row.get("Адрес") or "").replace("\n", " ")).strip()
    # try to extract city as first comma-separated piece
    city = addr.split(",")[0].strip() if addr else ""
    return {
        "first_name": first_name, "last_name": last_name,
        "email": "", "phone": phone,
        "country": "UA", "city": city,
    }

# ---------- main ----------
def main():
    print(f"Reading {CSV_PATH}\n")

    buckets = {"A": [], "B": [], "C": [], "D": [], "E": [], "F": [], "orphan": []}
    with open(CSV_PATH, "r", encoding="utf-8-sig") as fp:
        reader = csv.DictReader(fp)
        for i, row in enumerate(reader, 2):
            fmt = classify(row)
            row["_source_line"] = i
            row["_format"] = fmt
            buckets[fmt].append(row)

    counts = {k: len(v) for k, v in buckets.items()}
    print("Classification:")
    for k in "ABEFCD":
        label = {"D":"B2B excluded","C":"review (multi)","A":"parsed","B":"parsed","E":"parsed","F":"parsed (\\n-fields)"}[k]
        print(f"  {k}: {counts[k]:>4}  ({label})")
    print(f"  orphan: {counts['orphan']}")
    print()

    # ---------- write clean_customers.csv (A + B + E) ----------
    clean_path = OUT_DIR / "clean_customers.csv"
    with open(clean_path, "w", encoding="utf-8", newline="") as fp:
        w = csv.writer(fp)
        w.writerow([
            "format","email","first_name","last_name","phone","country","city",
            "order_raw","size","total","currency","date_raw","source_line",
        ])
        for row in buckets["B"]:
            p = parse_format_b(row)
            amount, currency, _ = parse_total(row.get("Тотал") or "")
            w.writerow(["B", p["email"], p["first_name"], p["last_name"], p["phone"],
                        p["country"], p["city"], row.get("Заказ",""), row.get("Размер",""),
                        amount or "", currency, row.get("Тотал",""), row["_source_line"]])
        for row in buckets["E"]:
            p = parse_format_e(row)
            amount, currency, _ = parse_total(row.get("Тотал") or "")
            w.writerow(["E", "", p["first_name"], p["last_name"], p["phone"],
                        p["country"], p["city"], row.get("Заказ",""), row.get("Размер",""),
                        amount or "", currency, row.get("Тотал",""), row["_source_line"]])
        for row in buckets["A"]:
            p = parse_format_a(row)
            amount, currency, _ = parse_total(row.get("Тотал") or "")
            w.writerow(["A", "", p["first_name"], p["last_name"], p["phone"],
                        p["country"], p["city"], row.get("Заказ",""), row.get("Размер",""),
                        amount or "", currency, row.get("Тотал",""), row["_source_line"]])
        for row in buckets["F"]:
            p = parse_format_f(row)
            amount, currency, _ = parse_total(row.get("Тотал") or "")
            w.writerow(["F", "", p["first_name"], p["last_name"], p["phone"],
                        p["country"], p["city"], row.get("Заказ",""), row.get("Размер",""),
                        amount or "", currency, row.get("Тотал",""), row["_source_line"]])
    n_clean = len(buckets['A']) + len(buckets['B']) + len(buckets['E']) + len(buckets['F'])
    print(f"✓ {clean_path}  ({n_clean} rows)")

    # ---------- b2b_orders.csv ----------
    b2b_path = OUT_DIR / "b2b_orders.csv"
    with open(b2b_path, "w", encoding="utf-8", newline="") as fp:
        w = csv.writer(fp)
        w.writerow(["source_line","ФИО","Адрес","Телефон","Заказ","Размер","Тотал"])
        for row in buckets["D"]:
            w.writerow([row["_source_line"], row.get("ФИО",""), row.get("Адрес",""),
                        row.get("Номер телефона",""), row.get("Заказ",""), row.get("Размер",""), row.get("Тотал","")])
    print(f"✓ {b2b_path}  ({len(buckets['D'])} rows)")

    # ---------- multi_customer_review.csv ----------
    multi_path = OUT_DIR / "multi_customer_review.csv"
    with open(multi_path, "w", encoding="utf-8", newline="") as fp:
        w = csv.writer(fp)
        w.writerow(["source_line","ФИО","Адрес","Телефон","Заказ","Размер","Тотал"])
        for row in buckets["C"]:
            w.writerow([row["_source_line"], row.get("ФИО",""), row.get("Адрес",""),
                        row.get("Номер телефона",""), row.get("Заказ",""), row.get("Размер",""), row.get("Тотал","")])
    print(f"✓ {multi_path}  ({len(buckets['C'])} rows — needs manual review)")

    # ---------- orphans.csv ----------
    orph_path = OUT_DIR / "orphans.csv"
    with open(orph_path, "w", encoding="utf-8", newline="") as fp:
        w = csv.writer(fp)
        w.writerow(["source_line","ФИО","Адрес","Телефон","Заказ","Размер","Тотал"])
        for row in buckets["orphan"]:
            w.writerow([row["_source_line"], row.get("ФИО",""), row.get("Адрес",""),
                        row.get("Номер телефона",""), row.get("Заказ",""), row.get("Размер",""), row.get("Тотал","")])
    print(f"✓ {orph_path}  ({len(buckets['orphan'])} rows)")

    # ---------- summary ----------
    n_a = len(buckets["A"]); n_b = len(buckets["B"]); n_e = len(buckets["E"]); n_f = len(buckets["F"])
    n_real = n_a + n_b + n_e + n_f
    print(f"\nReal customer rows: {n_real} ({n_b} with email, {n_a+n_e+n_f} no email)")
    print(f"B2B (showroom etc):   {len(buckets['D'])}")
    print(f"Multi-customer (manual): {len(buckets['C'])}")
    print(f"Orphans:                 {len(buckets['orphan'])}")

if __name__ == "__main__":
    main()
