"""
One-time script: sync all active subscribers from Supabase → Klaviyo.
Uses subscription bulk-create with historical_import=true so profiles
get proper "Subscribed" status instead of "Never subscribed".
Run: python3 -u klaviyo_sync.py
"""
import os, time, requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL    = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY    = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY", "")
KLAVIYO_API_KEY = os.getenv("KLAVIYO_API_KEY", "")
KLAVIYO_LIST_ID = os.getenv("KLAVIYO_LIST_ID", "")

kl_headers = {
    "Authorization": f"Klaviyo-API-Key {KLAVIYO_API_KEY}",
    "revision": "2024-10-15",
    "Content-Type": "application/json",
}

# --- fetch subscribers via REST ---
print("Fetching subscribers from Supabase...", flush=True)
res = requests.get(
    f"{SUPABASE_URL}/rest/v1/email_subscribers",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    },
    params={"is_active": "eq.true", "select": "email,first_source,first_seen_at"},
    timeout=15,
)
if not res.ok:
    print(f"Supabase error: {res.status_code} {res.text[:200]}", flush=True)
    exit(1)

rows = res.json()
print(f"Found {len(rows)} active subscribers", flush=True)
if not rows:
    print("Nothing to sync.", flush=True)
    exit(0)

# --- fetch names from user_profiles ---
print("Fetching names from user_profiles...", flush=True)
profiles_res = requests.get(
    f"{SUPABASE_URL}/rest/v1/user_profiles",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    },
    params={"select": "email,first_name,last_name"},
    timeout=15,
)
name_map = {}
if profiles_res.ok:
    for p in profiles_res.json():
        name_map[p["email"]] = (p.get("first_name") or "", p.get("last_name") or "")
    print(f"Got names for {len(name_map)} profiles", flush=True)
else:
    print(f"Could not fetch profiles: {profiles_res.status_code}", flush=True)

# --- bulk subscribe ---
# Send in batches of 100 (Klaviyo limit)
BATCH = 100
ok = err = 0

for i in range(0, len(rows), BATCH):
    batch = rows[i:i+BATCH]
    profiles_data = []
    for r in batch:
        if not r.get("email"):
            continue
        consented_at = r.get("first_seen_at") or "2024-01-01T00:00:00+00:00"
        profiles_data.append({
            "type": "profile",
            "attributes": {
                "email": r["email"],
                "subscriptions": {
                    "email": {
                        "marketing": {
                            "consent": "SUBSCRIBED",
                            "consented_at": consented_at,
                        }
                    }
                },
            },
        })

    r = requests.post(
        "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/",
        headers=kl_headers,
        json={
            "data": {
                "type": "profile-subscription-bulk-create-job",
                "attributes": {
                    "custom_source": "Supabase historical import",
                    "historical_import": True,
                    "profiles": {"data": profiles_data},
                },
                "relationships": {
                    "list": {"data": {"type": "list", "id": KLAVIYO_LIST_ID}},
                },
            }
        },
        timeout=15,
    )

    if r.status_code in (200, 201, 202):
        ok += len(batch)
        print(f"  Batch {i//BATCH + 1}: {len(batch)} subscribers queued", flush=True)
    else:
        err += len(batch)
        print(f"  Batch {i//BATCH + 1} ERROR {r.status_code}: {r.text[:300]}", flush=True)

    time.sleep(0.5)

print(f"\nSubscriptions: {ok} queued, {err} errors", flush=True)
print("Klaviyo processes subscriptions async — waiting 5s before updating names...", flush=True)
time.sleep(5)

# --- update names via profile search + patch ---
print("\nUpdating names...", flush=True)
name_ok = name_skip = 0
for email, (first_name, last_name) in name_map.items():
    if not first_name and not last_name:
        name_skip += 1
        continue
    # find profile id
    search = requests.get(
        "https://a.klaviyo.com/api/profiles/",
        headers=kl_headers,
        params={"filter": f"equals(email,\"{email}\")"},
        timeout=10,
    )
    if not search.ok or not search.json().get("data"):
        name_skip += 1
        continue
    profile_id = search.json()["data"][0]["id"]
    attrs = {}
    if first_name:
        attrs["first_name"] = first_name
    if last_name:
        attrs["last_name"] = last_name
    patch = requests.patch(
        f"https://a.klaviyo.com/api/profiles/{profile_id}/",
        headers=kl_headers,
        json={"data": {"type": "profile", "id": profile_id, "attributes": attrs}},
        timeout=10,
    )
    if patch.ok:
        name_ok += 1
        print(f"  + {email} → {first_name} {last_name}".strip(), flush=True)
    else:
        name_skip += 1
        print(f"  ! {email} name update failed: {patch.status_code}", flush=True)
    time.sleep(0.2)

print(f"\nNames updated: {name_ok}, skipped: {name_skip}", flush=True)
print("Done.", flush=True)
