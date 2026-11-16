# ZUNE Seller Portal

Standalone, mobile-first seller portal for ZUNE Marketplace. Built with vanilla HTML, CSS, and JavaScript.

## Authentication milestone
- ZUNE Seller Portal has an independent Supabase Auth identity for each approved store.
- Store login uses **Store Name + Store Password** only; it never uses the Marketplace password.
- Seller password is stored as a bcrypt hash on the server and accepts the agreed minimum of 4 characters.
- First-time setup and password recovery use a one-time code sent to the email on the Seller Application.
- The email on the application must match the Marketplace Auth account email, and the OTP must verify the original owner account.
- Only an active, Admin-approved store with a verified owner link can create or use a Seller Portal identity.
- The Seller Portal uses a separate browser storage key (`zune-seller-portal-auth`) so it does not overwrite the Marketplace Supabase session.
- Login and OTP requests are rate-limited server-side.
- Existing store, product, and order rows are not re-created or reassigned.

## Backend
- Supabase project: `rpkogiieegqgxqbzwxwo`
- Edge Function: `seller-portal-auth` (JWT verification is disabled at the gateway because it performs its own checks and handles first-time OTP setup; never trust browser-supplied owner IDs).
- Private table: `private.seller_portal_identities`
- RLS maps the dedicated seller auth identity to its verified Marketplace owner for the seller's own store, products, orders, order items, profile, and notifications.
- The Supabase service-role key is used only inside the Edge Function environment and is never placed in the repository or browser code.

### Required Supabase email template setting
To send a six-digit code instead of a magic link, open **Supabase Dashboard → Authentication → Email Templates → Magic Link** and make the message include the OTP token variable:

```html
<h2>ZUNE Seller Portal verification</h2>
<p>Your one-time verification code is: {{ .Token }}</p>
```

Save the template. Keep OTP expiry and rate limits enabled. The Seller Portal uses the Email OTP flow and will not ask for the Marketplace password.

## Files
- `index.html`, `login.css`, `login.js` — login, first-time password setup, OTP verification, and password recovery.
- `dashboard.html`, `dashboard.js` — authenticated Seller Portal landing page and current-store lookup.
- `store-entry.html`, `store-entry.css`, `store-entry.js` — customer store welcome transition.
- `.github/workflows/pages.yml` — GitHub Pages deployment.

## Deployment
Pushes to `main` trigger GitHub Pages deployment. In repository Settings → Pages, the source must be **GitHub Actions**.

## Important
The authentication backend and schema are deployed, but the end-to-end OTP/password login still requires a real email-template check and a controlled test with an approved seller account. Do not announce production readiness until that test succeeds.
