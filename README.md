# Detty Dezemba Festival — website starter

This is a responsive, interactive front-end prototype for the event.

## Event details currently entered
- Date: Saturday, 12 December 2026
- Venue: Laureate Gardens, Nairobi
- Regular: KSh 1,000
- VIP: KSh 5,000
- VVIP: KSh 10,000
- Payment methods planned: M-Pesa Till, M-Pesa Paybill, PayPal, Visa/Mastercard

## Run the preview
Open `index.html` in a modern browser. Ticket quantity selection and the checkout preview work. The checkout deliberately does **not** collect money or issue tickets.

## Important: what remains before public launch
1. Confirm event organiser identity, contact details, artist booking/appearance rights, ticket inventory, age restrictions, refund terms and privacy policy.
2. Create/verify merchant accounts with payment providers.
3. Configure secure server-side payment initiation and signed webhooks. Never put secret API keys in browser JavaScript.
4. Add a database for orders, payment status, ticket inventory and QR ticket IDs.
5. Generate and email/SMS unique QR tickets only after verified successful payment.
6. Add an authenticated admin dashboard and QR check-in scanner.
7. Deploy to a hosting account and connect a domain.

## Suggested payment architecture
- IntaSend can handle Kenya M-Pesa STK Push and card checkout. Its documentation describes connecting an existing merchant Till **or** Paybill shortcode to collections. Confirm with IntaSend how to support both shortcodes on one merchant integration before promising both as live STK options.
- PayPal Checkout can handle PayPal and, subject to account/approval/availability, guest card payments.
- If a single checkout provider can support all desired local and international methods under your merchant account, use that to simplify reconciliation.

Official references:
- IntaSend own Till or Paybill setup: https://developers.intasend.com/guides/collections/own-mpesa-till-paybill/
- IntaSend Kenya collection methods: https://developers.intasend.com/countries/kenya/
- PayPal Kenya Checkout: https://pep.paypal.com/ke/business/accept-payments/checkout/integration
- Vercel deployment: https://vercel.com/docs/projects/deploy-from-cli

## Credentials to prepare (do not send secrets in chat)
- IntaSend live merchant account and API secret key; Daraja app consumer key/secret and Safaricom passkey; approved shortcode(s); webhook configuration.
- PayPal Business account, verified bank/withdrawal setup, developer app Client ID and Secret.
- Domain name and hosting account.
- Organiser support email and customer support phone number.

## Security and compliance
The website must trust provider-verified webhook events—not a browser redirect or screenshot—to mark orders as paid. Use HTTPS, validate webhook signatures, prevent duplicate webhook processing, enforce ticket limits server-side, and keep API secrets in server-side environment variables.

## Merchant details supplied for setup
- M-Pesa Till: `8189426`
- M-Pesa Paybill: `542542`
- Paybill account/reference: `804057`

These identifiers are included in `.env.example` as configuration references. They do not activate payment processing on their own. Obtain provider approval/API credentials and add secrets only to the hosting provider's encrypted environment settings—never to frontend JavaScript, public files, email, or chat.
