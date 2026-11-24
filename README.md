# Detty Dezemba Festival — website

## Official event details
- Date: Saturday, 12 December 2026
- Time: 2:00 PM Saturday to 5:00 AM Sunday, 13 December 2026 (EAT)
- Venue: Laureate Gardens, Kasarani, Nairobi, Kenya
- Featured lineup: Wizkid, Uncle Waffles and Dancer Faith
- Official website: https://www.dettydezembaticketsexp.shop
- Official email: detty.dezembatickets@gmail.com
- Official phone: +254180134621
- Payment methods shown at checkout: M-Pesa and PayPal

## Current ticket categories
- General Access: KSh 5,000
- Duo Ticket: KSh 9,000
- Priority Access IV (VIP): KSh 20,000
- One Dance VVIP: KSh 30,000
- Premium Access for Two: KSh 37,999
- Kese Table: KSh 200,000
- Joro Table: KSh 500,000
- Soco Table: KSh 1,000,000
- Star Boy Table: KSh 2,000,000

## Main files
- `index.html` — festival homepage and ticket checkout interface
- `tickets.html` — ticket categories, prices and purchase-intent content
- `app.js` — ticket selection, checkout, PayPal and M-Pesa browser flows
- `analytics.js` — optional GA4 page and checkout funnel instrumentation
- `api/analytics/config.js` — serves the public GA4 Measurement ID when configured
- `api/paypal/` — PayPal order creation and capture
- `api/mpesa/` — M-Pesa STK Push and Safaricom callback
- `lib/ga4.js` — server-side GA4 purchase event helper
- `ANALYTICS-SETUP.md` — GA4 property, environment variable and key-event setup

## Payments and purchase verification
The website supports M-Pesa and PayPal. PayPal purchases are recorded for analytics only after PayPal confirms a completed capture. M-Pesa purchases are recorded for analytics only after Safaricom's callback reports a successful result and provides a receipt number. An initiated STK Push is not counted as a purchase.

GA4 is not the payment ledger. Reconcile actual sales against Safaricom and PayPal transaction records.

## Analytics activation required
The GA4 implementation is committed but inactive until the Detty Dezemba GA4 web stream is created and these Vercel Production environment variables are configured:
- `GA4_MEASUREMENT_ID`
- `GA4_API_SECRET`

Follow `ANALYTICS-SETUP.md` before expecting analytics events or sales reports. No measurement ID or API secret is stored in the repository.

## Security
Never put payment credentials, GA4 API secrets, M-Pesa PINs, or customer personal information in frontend code or source control. Do not send buyer names, email addresses or phone numbers to Google Analytics.
