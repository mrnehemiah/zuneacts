# ZUNE Seller Portal

Standalone, mobile-first seller portal for ZUNE Marketplace. Built with vanilla HTML, CSS, and JavaScript.

## Current milestone
- Premium centered login card in emerald and white.
- Official ZUNE mark: four circular letters (Z, U, N, E) with continuous wave motion.
- Store Name + separate Store Password fields; placeholder example: **Zuhura Shop**.
- Kiswahili / English language switch.
- Admin Mkuu approval is required before seller access.
- Customer store-entry transition with animated ZUNE circles and a dynamic store name.

## Authentication and security
The login interface is deployed as a visual milestone, but secure independent Store Name + Store Password authentication is **not yet enabled**. The form intentionally reports that sign-in is unavailable rather than simulating a successful login. The existing legacy store-login Edge Function is disabled and must not be used.

The next backend milestone must verify the store password server-side, enforce Admin approval and seller account status, issue a valid Supabase Auth session, and include rate limiting and password recovery. Never check passwords in browser JavaScript, store plaintext passwords, or expose a service-role key.

Supabase project: `rpkogiieegqgxqbzwxwo`. Browser code uses only the publishable key if/when required.

## Files
- `index.html` — Seller Login
- `login.css` — responsive login card and continuous circular-letter wave animation
- `login.js` — language switch, password visibility, and safe not-ready state
- `store-entry.html` — customer welcome transition preview
- `store-entry.css` — customer transition styling and animations
- `store-entry.js` — reads the store name from the `store` or `name` query parameter
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow

## Preview
- Login: `/`
- Store transition example: `/store-entry.html?store=Zuhura%20Shop`

## Deployment
Pushing to `main` triggers the GitHub Pages workflow. The repository's Pages deployment must be enabled with **GitHub Actions** as its source.

## Next
Complete and test the independent seller authentication backend before enabling sign-in or building protected dashboard pages.
