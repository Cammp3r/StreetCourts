import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SERVER_ORIGIN = process.env.SERVER_ORIGIN || `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in env');
}

const app = express();

function buildGoogleAuthUrl(redirectUri, state) {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', CLIENT_ID);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'openid email profile');
  u.searchParams.set('access_type', 'offline');
  if (state) u.searchParams.set('state', state);
  u.searchParams.set('prompt', 'consent');
  return u.toString();
}

app.get('/auth/google', (req, res) => {
  const redirectUri = `${SERVER_ORIGIN}/auth/google/callback`;
  const state = req.query.state || '';
  const url = buildGoogleAuthUrl(redirectUri, state);
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: `${SERVER_ORIGIN}/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResp.json();
    if (tokenData.error) {
      console.error('Token exchange error', tokenData);
      return res.status(500).json(tokenData);
    }

    const idToken = tokenData.id_token;
    let profile = {};
    if (idToken) {
      try {
        const parts = idToken.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        profile = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        };
      } catch (e) {
        console.warn('Failed to parse id_token', e);
      }
    }

    const ourToken = jwt.sign({ user: profile }, JWT_SECRET, { expiresIn: '7d' });

    // Redirect back to frontend with our JWT (for dev). In production prefer httpOnly cookie.
    const redirect = new URL(FRONTEND_URL);
    redirect.searchParams.set('token', ourToken);
    res.redirect(redirect.toString());
  } catch (err) {
    console.error(err);
    res.status(500).send('Auth error');
  }
});

app.get('/auth/verify', (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(' ')?.[1];
  if (!token) return res.status(401).json({ ok: false });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(401).json({ ok: false });
  }
});

app.get('/', (req, res) => res.send('Auth proxy running'));

app.listen(PORT, () => {
  console.log(`Auth proxy listening on ${SERVER_ORIGIN}`);
});
