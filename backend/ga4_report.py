#!/usr/bin/env python3
"""Generate a practical GA4 launch report for the store.

Required environment:
  GA4_PROPERTY_ID=123456789

OAuth environment:
  GA4_OAUTH_CLIENT_SECRETS=/absolute/path/to/oauth-client.json

Service account environment:
  GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json

Optional:
  GA4_START_DATE=2026-05-01
  GA4_END_DATE=today
  GA4_TOKEN_PATH=/absolute/path/to/ga4-token.json
"""

from __future__ import annotations

import argparse
import csv
import json
import os
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = ROOT / "exports" / "ga4"
GA4_READONLY_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"


def load_ga4_api() -> dict[str, Any]:
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Metric,
            OrderBy,
            RunReportRequest,
        )
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ModuleNotFoundError as exc:
        if exc.name != "google":
            raise
        raise SystemExit(
            "Missing GA4 OAuth dependencies. Run: "
            "python -m pip install 'google-analytics-data>=0.18.0,<1.0.0' "
            "'google-auth-oauthlib>=1.2.0,<2.0.0'"
        ) from exc

    return {
        "BetaAnalyticsDataClient": BetaAnalyticsDataClient,
        "Credentials": Credentials,
        "DateRange": DateRange,
        "Dimension": Dimension,
        "InstalledAppFlow": InstalledAppFlow,
        "Metric": Metric,
        "OrderBy": OrderBy,
        "Request": Request,
        "RunReportRequest": RunReportRequest,
    }


def load_local_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


@dataclass(frozen=True)
class ReportSpec:
    name: str
    title: str
    dimensions: tuple[str, ...]
    metrics: tuple[str, ...]
    limit: int = 25
    order_metric: str | None = None


REPORTS: tuple[ReportSpec, ...] = (
    ReportSpec(
        name="daily_overview",
        title="Daily Overview",
        dimensions=("date",),
        metrics=("activeUsers", "newUsers", "sessions", "engagedSessions", "engagementRate", "screenPageViews", "eventCount", "totalRevenue"),
        limit=90,
    ),
    ReportSpec(
        name="traffic_sources",
        title="Traffic Sources",
        dimensions=("sessionDefaultChannelGroup", "sessionSourceMedium"),
        metrics=("activeUsers", "sessions", "engagedSessions", "engagementRate", "screenPageViews", "eventCount", "totalRevenue"),
        limit=50,
        order_metric="sessions",
    ),
    ReportSpec(
        name="landing_pages",
        title="Landing Pages",
        dimensions=("landingPagePlusQueryString",),
        metrics=("activeUsers", "sessions", "engagedSessions", "engagementRate", "screenPageViews", "eventCount", "totalRevenue"),
        limit=50,
        order_metric="sessions",
    ),
    ReportSpec(
        name="pages",
        title="Pages And Screens",
        dimensions=("pagePathPlusQueryString",),
        metrics=("activeUsers", "screenPageViews", "averageSessionDuration", "eventCount", "totalRevenue"),
        limit=50,
        order_metric="screenPageViews",
    ),
    ReportSpec(
        name="devices",
        title="Devices",
        dimensions=("deviceCategory", "browser", "operatingSystem"),
        metrics=("activeUsers", "sessions", "engagedSessions", "engagementRate", "screenPageViews", "eventCount", "totalRevenue"),
        limit=50,
        order_metric="sessions",
    ),
    ReportSpec(
        name="geo_countries",
        title="Countries",
        dimensions=("country",),
        metrics=("activeUsers", "sessions", "engagedSessions", "engagementRate", "screenPageViews", "eventCount", "totalRevenue"),
        limit=50,
        order_metric="activeUsers",
    ),
    ReportSpec(
        name="geo_cities",
        title="Cities",
        dimensions=("country", "city"),
        metrics=("activeUsers", "sessions", "engagedSessions", "engagementRate", "screenPageViews", "eventCount", "totalRevenue"),
        limit=50,
        order_metric="activeUsers",
    ),
    ReportSpec(
        name="events",
        title="Events",
        dimensions=("eventName",),
        metrics=("eventCount", "activeUsers", "totalUsers", "totalRevenue"),
        limit=100,
        order_metric="eventCount",
    ),
    ReportSpec(
        name="ecommerce_items",
        title="Ecommerce Items",
        dimensions=("itemName", "itemId", "itemCategory"),
        metrics=("itemsViewed", "itemsAddedToCart", "itemsCheckedOut", "itemsPurchased", "itemRevenue"),
        limit=100,
        order_metric="itemsViewed",
    ),
)

FUNNEL_EVENTS = (
    "session_start",
    "view_item",
    "add_to_cart",
    "view_cart",
    "begin_checkout",
    "add_shipping_info",
    "add_payment_info",
    "purchase",
)

QUALITY_EVENTS = (
    "404_view",
    "payment_error",
    "form_error",
    "checkout_error",
    "coupon_error",
    "out_of_stock_view",
    "add_to_cart_error",
    "search_no_results",
    "size_unavailable",
    "shipping_unavailable",
    "newsletter_signup",
    "size_guide_open",
    "returns_policy_open",
)


def parse_args() -> argparse.Namespace:
    default_start = os.getenv("GA4_START_DATE") or (date.today() - timedelta(days=30)).isoformat()
    default_end = os.getenv("GA4_END_DATE", "today")

    parser = argparse.ArgumentParser(description="Generate GA4 launch analytics reports.")
    parser.add_argument("--property-id", default=os.getenv("GA4_PROPERTY_ID"), help="GA4 property ID.")
    parser.add_argument("--start-date", default=default_start, help="YYYY-MM-DD, yesterday, today, or NdaysAgo.")
    parser.add_argument("--end-date", default=default_end, help="YYYY-MM-DD, yesterday, today, or NdaysAgo.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Directory for Markdown/JSON/CSV output.")
    parser.add_argument("--oauth-client-secrets", default=os.getenv("GA4_OAUTH_CLIENT_SECRETS"), help="OAuth Desktop client JSON path.")
    parser.add_argument("--token-path", default=os.getenv("GA4_TOKEN_PATH", str(ROOT / "backend" / "ga4-token.json")), help="Local OAuth token cache path.")
    parser.add_argument("--limit", type=int, default=None, help="Override row limit for all tabular reports.")
    return parser.parse_args()


def build_client(ga4: dict[str, Any], args: argparse.Namespace) -> Any:
    oauth_client_secrets = args.oauth_client_secrets
    service_account_credentials = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    if oauth_client_secrets:
        return build_oauth_client(ga4, Path(oauth_client_secrets), Path(args.token_path))

    if service_account_credentials:
        return ga4["BetaAnalyticsDataClient"]()

    raise SystemExit(
        "Missing GA4 credentials. Set GA4_OAUTH_CLIENT_SECRETS for OAuth or "
        "GOOGLE_APPLICATION_CREDENTIALS for a service account."
    )


def build_oauth_client(ga4: dict[str, Any], client_secrets_path: Path, token_path: Path) -> Any:
    if not client_secrets_path.exists():
        raise SystemExit(f"OAuth client JSON not found: {client_secrets_path}")

    Credentials = ga4["Credentials"]
    InstalledAppFlow = ga4["InstalledAppFlow"]
    Request = ga4["Request"]
    BetaAnalyticsDataClient = ga4["BetaAnalyticsDataClient"]

    credentials = None
    if token_path.exists():
        credentials = Credentials.from_authorized_user_file(str(token_path), [GA4_READONLY_SCOPE])

    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(client_secrets_path), [GA4_READONLY_SCOPE])
            credentials = flow.run_local_server(port=0)

        token_path.parent.mkdir(parents=True, exist_ok=True)
        token_path.write_text(credentials.to_json(), encoding="utf-8")

    return BetaAnalyticsDataClient(credentials=credentials)


def run_report(
    client: Any,
    ga4: dict[str, Any],
    property_id: str,
    spec: ReportSpec,
    start_date: str,
    end_date: str,
    limit_override: int | None = None,
) -> dict[str, Any]:
    DateRange = ga4["DateRange"]
    Dimension = ga4["Dimension"]
    Metric = ga4["Metric"]
    OrderBy = ga4["OrderBy"]
    RunReportRequest = ga4["RunReportRequest"]

    order_bys = []
    if spec.order_metric:
        order_bys.append(OrderBy(metric=OrderBy.MetricOrderBy(metric_name=spec.order_metric), desc=True))

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name=name) for name in spec.dimensions],
        metrics=[Metric(name=name) for name in spec.metrics],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        order_bys=order_bys,
        limit=limit_override or spec.limit,
    )

    response = client.run_report(request)
    rows = []
    for row in response.rows:
        item: dict[str, str] = {}
        for header, value in zip(response.dimension_headers, row.dimension_values):
            item[header.name] = value.value
        for header, value in zip(response.metric_headers, row.metric_values):
            item[header.name] = value.value
        rows.append(item)

    return {
        "name": spec.name,
        "title": spec.title,
        "dimensions": list(spec.dimensions),
        "metrics": list(spec.metrics),
        "row_count": response.row_count,
        "rows": rows,
    }


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def get_float(row: dict[str, str], key: str) -> float:
    try:
        return float(row.get(key, "0") or 0)
    except ValueError:
        return 0.0


def top_rows(rows: list[dict[str, str]], metric: str, count: int = 5) -> list[dict[str, str]]:
    return sorted(rows, key=lambda row: get_float(row, metric), reverse=True)[:count]


def markdown_table(rows: list[dict[str, str]], columns: list[str], max_rows: int = 10) -> str:
    if not rows:
        return "_No rows returned._"

    output = [
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join("---" for _ in columns) + " |",
    ]
    for row in rows[:max_rows]:
        values = [str(row.get(column, "")).replace("\n", " ") for column in columns]
        output.append("| " + " | ".join(values) + " |")
    return "\n".join(output)


def event_count(events_report: dict[str, Any], event_name: str) -> float:
    for row in events_report.get("rows", []):
        if row.get("eventName") == event_name:
            return get_float(row, "eventCount")
    return 0.0


def build_markdown(payload: dict[str, Any]) -> str:
    reports = payload["reports"]
    report_map = {report["name"]: report for report in reports if "rows" in report}
    errors = [report for report in reports if "error" in report]
    date_range = payload["date_range"]

    lines = [
        "# GA4 Launch Report",
        "",
        f"Property: `{payload['property_id']}`",
        f"Date range: `{date_range['start_date']}` to `{date_range['end_date']}`",
        "",
    ]

    overview_rows = report_map.get("daily_overview", {}).get("rows", [])
    totals = {
        "activeUsers": sum(get_float(row, "activeUsers") for row in overview_rows),
        "newUsers": sum(get_float(row, "newUsers") for row in overview_rows),
        "sessions": sum(get_float(row, "sessions") for row in overview_rows),
        "engagedSessions": sum(get_float(row, "engagedSessions") for row in overview_rows),
        "screenPageViews": sum(get_float(row, "screenPageViews") for row in overview_rows),
        "eventCount": sum(get_float(row, "eventCount") for row in overview_rows),
        "totalRevenue": sum(get_float(row, "totalRevenue") for row in overview_rows),
    }

    lines.extend(
        [
            "## Executive Snapshot",
            "",
            f"- Active users: **{totals['activeUsers']:,.0f}**",
            f"- New users: **{totals['newUsers']:,.0f}**",
            f"- Sessions: **{totals['sessions']:,.0f}**",
            f"- Engaged sessions: **{totals['engagedSessions']:,.0f}**",
            f"- Page views: **{totals['screenPageViews']:,.0f}**",
            f"- Events: **{totals['eventCount']:,.0f}**",
            f"- Total revenue: **{totals['totalRevenue']:,.2f}**",
            "",
        ]
    )

    events_report = report_map.get("events", {})
    if events_report:
        lines.extend(["## Funnel Events", ""])
        funnel_rows = [{"event": event_name, "eventCount": f"{event_count(events_report, event_name):,.0f}"} for event_name in FUNNEL_EVENTS]
        lines.extend([markdown_table(funnel_rows, ["event", "eventCount"], max_rows=len(funnel_rows)), ""])

        quality_rows = [
            {"event": event_name, "eventCount": f"{event_count(events_report, event_name):,.0f}"}
            for event_name in QUALITY_EVENTS
            if event_count(events_report, event_name) > 0
        ]
        lines.extend(["## Quality And Error Events", ""])
        lines.extend([markdown_table(quality_rows, ["event", "eventCount"], max_rows=len(quality_rows)), ""])

    sections = (
        ("traffic_sources", "sessions", ["sessionDefaultChannelGroup", "sessionSourceMedium", "sessions", "engagementRate", "totalRevenue"]),
        ("landing_pages", "sessions", ["landingPagePlusQueryString", "sessions", "engagedSessions", "engagementRate", "totalRevenue"]),
        ("devices", "sessions", ["deviceCategory", "browser", "operatingSystem", "sessions", "engagementRate", "totalRevenue"]),
        ("geo_countries", "activeUsers", ["country", "activeUsers", "sessions", "engagementRate", "totalRevenue"]),
        ("pages", "screenPageViews", ["pagePathPlusQueryString", "screenPageViews", "averageSessionDuration", "eventCount", "totalRevenue"]),
        ("ecommerce_items", "itemsViewed", ["itemName", "itemId", "itemCategory", "itemsViewed", "itemsAddedToCart", "itemsCheckedOut", "itemsPurchased", "itemRevenue"]),
    )

    for report_name, metric, columns in sections:
        report = report_map.get(report_name)
        if not report:
            continue
        lines.extend([f"## {report['title']}", ""])
        lines.extend([markdown_table(top_rows(report["rows"], metric), columns), ""])

    if errors:
        lines.extend(["## Reports That Need Attention", ""])
        for error in errors:
            lines.append(f"- `{error['name']}`: {error['error']}")
        lines.append("")

    lines.extend(
        [
            "## Suggested Next Checks",
            "",
            "- Confirm internal traffic is filtered.",
            "- Check whether paid/social/email links are consistently tagged with UTM parameters.",
            "- Compare mobile and desktop drop-off once ecommerce events are populated.",
            "- Investigate products with views but no add-to-cart activity.",
            "- Add custom events for size guide, unavailable sizes, checkout errors, coupon errors, and 404s if they are missing.",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    load_local_env(ROOT / "backend" / ".env")
    args = parse_args()

    if not args.property_id:
        raise SystemExit("Missing GA4 property ID. Set GA4_PROPERTY_ID or pass --property-id.")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    ga4 = load_ga4_api()
    client = build_client(ga4, args)
    reports = []
    for spec in REPORTS:
        try:
            report = run_report(client, ga4, args.property_id, spec, args.start_date, args.end_date, args.limit)
            reports.append(report)
            write_csv(output_dir / f"{spec.name}.csv", report["rows"])
        except Exception as exc:
            reports.append({"name": spec.name, "title": spec.title, "error": str(exc)})

    payload = {
        "property_id": args.property_id,
        "date_range": {"start_date": args.start_date, "end_date": args.end_date},
        "reports": reports,
    }

    (output_dir / "ga4_report.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    (output_dir / "ga4_report.md").write_text(build_markdown(payload), encoding="utf-8")

    print(f"Wrote {output_dir / 'ga4_report.md'}")
    print(f"Wrote {output_dir / 'ga4_report.json'}")


if __name__ == "__main__":
    main()
