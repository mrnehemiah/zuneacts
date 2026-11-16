# ZUNEMAR Seller Portal

Standalone, mobile-first seller portal for ZUNE Marketplace.

## Current build stage
- Step 1: Seller Login interface.
- Login uses Store Name + separate Store Password only.
- No ZUNE Marketplace password field.
- Seller access must be blocked until Head Admin approval.
- Kiswahili / English switch.

## Authentication boundary
The login page expects the Supabase Edge Function `zunemar-seller-login`. That independent login backend has **not yet been deployed**. The page must show a service-not-ready message until secure server authentication is implemented and tested. Never use client-side password checks.

Supabase project: `rpkogiieegqgxqbzwxwo`. Only the publishable key is used in browser code. Never commit a service-role key.

## Files
- `index.html` — login page
- `login.css` — responsive styling
- `login.js` — form, language switch, Edge Function client

## Next
Implement and test independent Store Name + Store Password server authentication, approval checks, secure sessions, recovery, rate limiting, and audit events.