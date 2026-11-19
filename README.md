# ZUNE Seller Portal

Standalone, mobile-first seller portal for ZUNE Marketplace. Built with vanilla HTML, CSS, and JavaScript.

## Seller authentication
- Independent Supabase Auth identity for each approved store.
- Store login uses Store Name + Store Password only; Marketplace password remains separate.
- Seller password is stored as a bcrypt hash on the server.
- First-time setup and password recovery use an OTP sent to the email on the Seller Application.
- Seller Portal uses its own browser storage key: `zune-seller-portal-auth`.
- Service-role credentials remain server-side in the Edge Function.

## Seller workspace
- `dashboard.html/css/js`: Premium Emerald + Ivory Business Overview, desktop sidebar and mobile bottom navigation, bilingual controls, store identity lookup, quick links and animated Tanzania-colour card borders.
- `more.html/css/js`: dedicated More page with grouped business, growth, finance, account and support tools.
- `deliveries.html/css/js`: seller-scoped delivery queue, approved driver assignment, seller handover confirmation, customer and driver map links, and 20-second visible-page refresh using the existing Supabase delivery RPCs.
- `workspace.html/css/js`: authenticated landing shell for individual modules. Modules that are not yet connected to their live data/actions are clearly marked as being prepared; no sample sales figures are presented as real data.
- Dashboard statistics remain blank until the actual seller-scoped data queries are connected and verified.
- Existing stores, products, orders and accounts are not recreated or reassigned.

## Login and setup
- `index.html`, `login.css`, `login.js`: Seller login.
- `setup.html`, `setup.js`, `setup-verify.html`, `setup-verify.js`: store password setup and recovery.

## Supabase backend
- Project: `rpkogiieegqgxqbzwxwo`
- Edge Function: `seller-portal-auth`
- Current-store lookup: `zune_seller_portal_current_store`
- Never place the service-role key in browser code.

## Deployment
Pushes to `main` trigger GitHub Pages deployment. In repository Settings → Pages, the source must be GitHub Actions.
