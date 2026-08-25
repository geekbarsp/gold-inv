# Narciso Geronimo Jewelry Inventory

A production-oriented inventory system for gold jewelry, built with Next.js 16, TypeScript, Supabase PostgreSQL, and a mobile camera barcode workflow.

## Included

- Passcode-only authentication with bcrypt verification, signed HttpOnly/SameSite session cookies, database-backed login rate limiting, logout, and configurable expiry
- Server-only Supabase access; secret credentials are never included in browser bundles
- Inventory creation, editing, Available/Sold transitions, sold timestamps, and strong-confirm soft deletion
- Database-level unique barcode and positive decimal-weight constraints
- Automatic per-item audit history and a general activity log
- Fast search, server pagination, column sorting, status/category/karat/date filters, and required minimum/maximum gram filters
- Rear-camera scanning for CODE 128, CODE 39, EAN-13/8, and UPC-A/E, with vibration, confirmation audio, camera switching, manual fallback, and torch support where available
- Immediate scan lookup, unknown-code “Add This Item” workflow, and duplicate checks before submission
- Live inventory statistics and category/karat weight summaries, responsive desktop table/mobile cards, filtered Excel-friendly CSV export, and configurable printable CODE 128 labels
- Shareable `/inventory/{barcode}` detail URLs and a Recently Deleted recovery screen
- Loading, empty, validation, expired-session, and connection error states

## Setup

1. Use Node.js 22 or newer (Node 24 is recommended).
2. Create a Supabase project.
3. Apply both SQL files in `supabase/migrations` in timestamp order. The initial migration creates the protected inventory schema; the second adds session revocation, recovery audit events, and dashboard breakdowns.
4. For development sample records only, optionally run [`supabase/seed.sql`](supabase/seed.sql).
5. Copy `.env.example` to `.env.local` and enter the project URL, server secret key, and a random session secret. Do not use `NEXT_PUBLIC_` for either Supabase value.
6. Generate the initial passcode hash:

   ```powershell
   npm run hash-passcode -- "choose-a-passcode"
   ```

   Put the result in `PASSCODE_HASH`, including the backslashes before each dollar sign. Next.js removes those escape characters when loading the environment. After first sign-in, the passcode can be changed in Settings; that hash is stored in the RLS-protected settings table.
7. Install and run:

   ```powershell
   npm install
   npm run dev
   ```

Open `http://localhost:3000`. To scan from a phone on the same LAN, run `npm run dev -- -H 0.0.0.0` and open the PC's LAN address on the phone. Browser camera APIs generally require HTTPS except on localhost, so use an HTTPS tunnel or deployment for reliable phone-camera permission.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

The SQL migration enables RLS on every public table and grants no browser roles. All data routes independently verify the signed session before using the server-held Supabase secret.

## Deployment

Deploy to any Node-compatible Next.js host and configure the same environment variables. Use HTTPS, keep `SUPABASE_SECRET_KEY`, `PASSCODE_HASH`, and `SESSION_SECRET` server-only, and apply migrations before the first request. Browser print provides label printing and Save as PDF.

## Windows desktop installer

Build the private, self-contained Windows installer with:

```powershell
npm run desktop:build
```

The result is `releases\Setup NG Inventory.exe`. It installs **NG Inventory**, creates Desktop and Start Menu shortcuts, and includes its own runtime, so the destination PC does not need Node.js. The build reads the server credentials from the ignored `.env.local`; therefore, the generated installer is private and must not be uploaded to a public release or shared outside the authorized store computers.

## Operational notes

- Barcode values are uppercased on creation and lookup and cannot be edited after creation.
- “Delete” sets `deleted_at`; it does not destroy the row or its audit history.
- CSV export respects status/category/karat/minimum-grams/maximum-grams filters and is capped at 50,000 rows per export.
- Camera hardware and permission prompts require a real device; automated tests cover validation while camera decoding should be acceptance-tested on the target phone over HTTPS.
