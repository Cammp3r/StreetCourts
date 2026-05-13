# Google OAuth (dev) — setup

1. Create Google OAuth credentials (Web application) in Google Cloud Console.
   - Set Authorized redirect URI to `http://localhost:4000/auth/google/callback` (or adjust `SERVER_ORIGIN`).

2. Create a `.env` file in `my-react-app` with:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=a_long_random_secret
FRONTEND_URL=http://localhost:5173
PORT=4000
SERVER_ORIGIN=http://localhost:4000
```

3. Install dependencies and run the auth proxy (from `my-react-app`):

```bash
npm install
npm run start:auth
```

4. Start the app (dev):

```bash
npm run dev
```

5. Flow (dev): click "Увійти через Google" → Google → callback to proxy → proxy exchanges code, issues JWT and redirects back to `FRONTEND_URL` with `?token=...` → frontend stores the token in `localStorage` and shows user.

Notes:
- This implementation redirects the JWT in the URL for development simplicity. For production use set an httpOnly Secure cookie in the proxy and verify tokens server-side.
- Set `VITE_AUTH_BASE` in Vite env if your proxy runs on a different origin.
