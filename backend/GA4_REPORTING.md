# GA4 reporting

This project includes a local GA4 Data API report generator:

```bash
python backend/ga4_report.py
```

Install the GA4 client first if your environment does not already have it:

```bash
python -m pip install 'google-analytics-data>=0.18.0,<1.0.0' 'google-auth-oauthlib>=1.2.0,<2.0.0'
```

## Setup

1. In Google Cloud, enable **Google Analytics Data API** for the project that owns your service account.
2. Create or use a service account and download its JSON key.
3. In GA4, open **Admin -> Property access management** and add the service account email as **Viewer**.
4. Add these values to `backend/.env`:

```bash
GA4_PROPERTY_ID=123456789
GA4_OAUTH_CLIENT_SECRETS=/absolute/path/to/oauth-client.json
GA4_TOKEN_PATH=/absolute/path/to/local-ga4-token.json
GA4_START_DATE=2026-05-01
GA4_END_DATE=today
```

For OAuth, create a **Desktop app** OAuth client in Google Cloud. The first script run opens a browser consent flow and stores a local token at `GA4_TOKEN_PATH`.

For service account auth instead of OAuth, use:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/ga4-service-account.json
```

Keep OAuth client JSON, service account JSON, and token files outside git. The repository ignores common local credential filenames, but an absolute path outside the project is safest.

## Output

The script writes:

- `exports/ga4/ga4_report.md`
- `exports/ga4/ga4_report.json`
- one CSV per report, such as `traffic_sources.csv`, `landing_pages.csv`, and `ecommerce_items.csv`

## Useful commands

```bash
python backend/ga4_report.py --start-date 2026-05-01 --end-date today
python backend/ga4_report.py --property-id 123456789 --start-date 14daysAgo --end-date yesterday
```

If a specific report fails because a GA4 metric is unavailable for the property, the script keeps running and lists that report under "Reports That Need Attention" in the Markdown output.
