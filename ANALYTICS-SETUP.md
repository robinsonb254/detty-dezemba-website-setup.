# Detty Dezemba — Google Analytics 4 setup

## Current implementation

The website now has optional GA4 browser instrumentation and server-side purchase measurement. It does not activate until the GA4 environment variables are configured.

Tracked browser events:
- page_view — sent by the Google tag on page load.
- select_item — a visitor adds a ticket to the basket.
- remove_from_cart — a visitor removes a ticket.
- begin_checkout — the visitor opens the checkout review.
- add_payment_info — the visitor selects M-Pesa or PayPal.

Purchase events:
- PayPal: sent by the server only after PayPal reports a completed capture.
- M-Pesa: sent by the server only after Safaricom's callback reports ResultCode 0 and supplies a receipt number.

M-Pesa callback purchases use a deterministic synthetic GA client ID because the current checkout does not persist the browser's GA client ID against the Safaricom CheckoutRequestID. This supports verified purchase counts and revenue, but M-Pesa purchases may not be attributable to the original traffic source/session in GA4. Do not interpret channel-level M-Pesa attribution as complete until a persistent order store links the browser client/session identifiers to the callback.

No buyer name, email, phone number, M-Pesa PIN, or other direct personal information is sent to GA4.

## Required Vercel environment variables

Add these to the Detty Dezemba Vercel project for Production (and Preview if desired):

- GA4_MEASUREMENT_ID — the Measurement ID from the GA4 web data stream, format G-XXXXXXXXXX.
- GA4_API_SECRET — a Measurement Protocol API secret created inside that same web data stream.

The measurement ID is exposed only through /api/analytics/config; the API secret stays server-side.

## Google Analytics setup steps

1. Create or select a GA4 property for Detty Dezemba Festival.
2. Create a Web data stream for https://www.dettydezembaticketsexp.shop.
3. Copy its Measurement ID into Vercel as GA4_MEASUREMENT_ID.
4. In the stream's Measurement Protocol API secrets section, create a secret and add it to Vercel as GA4_API_SECRET.
5. Redeploy the website after adding both variables.
6. In GA4 Admin → Events, confirm purchase appears after a real verified test transaction; mark it as a key event.
7. Use DebugView / Realtime to verify page_view, select_item, remove_from_cart, begin_checkout and add_payment_info.
8. Keep actual sales reconciliation anchored to Safaricom and PayPal transaction records. GA4 is an analytics report, not the payment ledger.

## Important limitation

The OpenSEO Google connection currently exposes no GA4 property for this website. Connect the correct Google account and bind the new Detty Dezemba GA4 property in OpenSEO before using GA4 reports there. Do not bind the Dala Festival property to Detty Dezemba.
