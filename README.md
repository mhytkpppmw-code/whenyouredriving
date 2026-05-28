# When You're Driving

Landing page and admin area for **When You're Driving**.

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local (see Admin login below)
npm run dev
```

Open http://localhost:3000. Admin login: http://localhost:3000/login

## Deploy

Connect this repo to [Vercel](https://vercel.com). Add the same environment variables from `.env.example` in Vercel → Settings → Environment Variables.

## Admin login (Sign in with Apple)

Only the email in `ADMIN_EMAIL` can access `/admin`. Everyone else is rejected after Apple sign-in.

### 1. Environment variables

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Random string: `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` locally, or `https://your-domain.com` in production |
| `ADMIN_EMAIL` | Your Apple ID email (must match exactly) |
| `AUTH_APPLE_ID` | Services ID from Apple Developer |
| `AUTH_APPLE_TEAM_ID` | Apple Developer Team ID |
| `AUTH_APPLE_KEY_ID` | Key ID for Sign in with Apple |
| `AUTH_APPLE_PRIVATE_KEY` | Contents of the `.p8` key file |

### 2. Apple Developer setup

Requires an [Apple Developer](https://developer.apple.com) account ($99/year).

1. **Identifiers** → **Services IDs** → create a Services ID (e.g. `com.yourname.whenyouredriving`).
2. Enable **Sign in with Apple** → Configure:
   - **Domains**: `localhost` (dev) and your production domain
   - **Return URLs**:
     - `http://localhost:3000/api/auth/callback/apple`
     - `https://your-domain.com/api/auth/callback/apple`
3. **Keys** → create a key with **Sign in with Apple** enabled → download `.p8` (once).
4. Copy **Team ID**, **Key ID**, Services ID → `AUTH_APPLE_ID`, and `.p8` contents → `AUTH_APPLE_PRIVATE_KEY`.

### 3. Vercel

Add all env vars for Production (and Preview if needed). Redeploy after saving.

### Routes

- `/` — public Coming Soon page
- `/login` — Sign in with Apple
- `/admin` — protected admin area (you only)