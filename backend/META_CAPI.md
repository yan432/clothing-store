# Meta Conversions API

Server-side purchase tracking is sent from the Stripe checkout webhook when an
order first becomes `paid`. The browser Pixel still fires on `/success`; both
events use the same `event_id` (`purchase-{order_id}`) so Meta can deduplicate
them.

## Required backend environment

```bash
META_PIXEL_ID=1608949326833856
META_CONVERSIONS_API_ACCESS_TOKEN=...
```

Optional:

```bash
META_GRAPH_API_VERSION=v25.0
META_TEST_EVENT_CODE=TEST12345
```

Use `META_TEST_EVENT_CODE` only while testing in Meta Events Manager. Remove it
for production traffic.

## Meta setup

1. Open Meta Events Manager.
2. Select the pixel/dataset for `edmclothes.net`.
3. Go to Settings -> Conversions API.
4. Generate an access token.
5. Put the token in the backend environment as
   `META_CONVERSIONS_API_ACCESS_TOKEN`.

Do not put the access token in frontend env vars. It is a server secret.

## Test flow

1. In Events Manager, open Test Events and copy the test event code.
2. Set `META_TEST_EVENT_CODE` in the backend environment.
3. Restart/deploy the backend.
4. Place a real Stripe test-mode checkout order.
5. Confirm that a server `Purchase` appears in Test Events.
6. Remove `META_TEST_EVENT_CODE` and redeploy before production traffic.

## Deploy notes

The backend currently reads these values at process startup, so changing them
requires a backend restart/redeploy.

## What is sent

- Standard event: `Purchase`
- Value/currency from the paid Stripe order
- Catalog `content_ids` matching `/feed.xml` IDs when product slugs are present
- Hashed customer fields: email, phone, name, city, state, zip, country
- Browser matching fields captured at checkout: `_fbp`, `_fbc`, user agent, IP

The backend sends the CAPI purchase event only when the storefront has saved
`cookie_consent=granted` for that checkout.
