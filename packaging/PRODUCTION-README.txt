NARCISO GERONIMO JEWELRY INVENTORY
Desktop + Mobile Production Package

WHAT THIS PACKAGE IS
One responsive application serves both the Windows desktop inventory interface
and the phone barcode-scanning interface. Both devices use the same Supabase data.

REQUIREMENTS
- Windows PC with Node.js 22 or newer: https://nodejs.org
- A configured Supabase project
- An HTTPS deployment or trusted HTTPS reverse proxy for phone camera access

FIRST-TIME DATABASE SETUP
1. Open the Supabase SQL Editor.
2. Apply every file in supabase\migrations in timestamp order.
3. Do not apply supabase\seed.sql in production. It is sample development data.

FIRST-TIME WINDOWS SETUP
1. Double-click SETUP-WINDOWS.cmd.
2. Enter the Supabase project URL and SERVER SECRET key when prompted.
3. Choose the inventory passcode. The setup hashes it before saving configuration.
4. Double-click START-WINDOWS.cmd.
5. Open http://localhost:3000 on the PC.

The setup creates .env.local. Never share that file. The package contains only
.env.example and no real credentials.

The generated bcrypt hash is escaped correctly for Next.js environment loading.
Do not remove the backslashes before its dollar signs in .env.local.

MOBILE ACCESS - IMPORTANT
Modern phone browsers require a secure HTTPS context for camera access. The app
also uses Secure authentication cookies in production. Therefore:

- http://localhost:3000 is appropriate for the Windows PC itself.
- A plain URL such as http://192.168.x.x:3000 is NOT the supported production
  barcode-scanning setup.
- For a phone, deploy the app to an HTTPS-capable Node.js host, or put a trusted
  HTTPS reverse proxy/tunnel in front of this PC's port 3000.
- Then open that HTTPS URL on the phone and grant rear-camera permission.

The phone and PC will show the same inventory because both use the same Supabase
project. No separate mobile database or mobile installation is required.

UPDATING THE PASSCODE
After signing in, open Settings and use Change Passcode. Existing older sessions
are revoked automatically.

STOPPING THE LOCAL SERVER
Close the launcher window or press Ctrl+C.

TROUBLESHOOTING
- "Missing .env.local": run SETUP-WINDOWS.cmd.
- Camera permission unavailable: confirm the phone URL begins with https://.
- Database connection error: verify Supabase URL/key and apply both migrations.
- Windows Firewall prompt: allow Node.js on the appropriate private network only.
