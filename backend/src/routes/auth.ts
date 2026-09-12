import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as authService from '../services/auth.service';
import { env } from '../config/env';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_NAME = 'refreshToken';

function getCookieOptions(req: Request) {
  // Use secure & sameSite=none only when HTTPS or behind an HTTPS reverse-proxy
  // Over plain HTTP (such as local Docker on localhost:5174), browsers reject sameSite=none and secure cookies
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);

    res.cookie(COOKIE_NAME, result.refreshToken, getCookieOptions(req));
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = req.cookies?.[COOKIE_NAME];
    if (!rawToken) {
      res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token' } });
      return;
    }
    const result = await authService.refreshAccessToken(rawToken);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = req.cookies?.[COOKIE_NAME];
    if (rawToken && req.user) {
      await authService.logoutUser(rawToken, req.user.userId);
    }
    res.clearCookie(COOKIE_NAME, { ...getCookieOptions(req), maxAge: 0 });
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

export default router;
