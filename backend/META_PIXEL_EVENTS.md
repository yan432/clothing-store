# Meta Pixel Standard Events

Implemented events for this store:

| Event | Where it fires |
| --- | --- |
| `PageView` | Every page after cookie consent is granted |
| `ViewContent` | Product detail page view |
| `AddToCart` | Add-to-cart action |
| `AddToWishlist` | Successful wishlist save |
| `Search` | Product search results page when `q` is present |
| `InitiateCheckout` | Checkout details page with a non-empty cart |
| `AddPaymentInfo` | Click on the Stripe payment handoff button |
| `Purchase` | Browser success page and server-side Stripe webhook via CAPI |
| `CompleteRegistration` | Account signup and newsletter signup |
| `Lead` | Back-in-stock waitlist and drop notification signup |
| `Contact` | Contact form submission or email link click |

Not implemented because they do not match the current store workflows:

- `CustomizeProduct`
- `Donate`
- `FindLocation`
- `Schedule`
- `StartTrial`
- `SubmitApplication`
- `Subscribe`

All browser Pixel events are gated by `cookie_consent=granted`.
