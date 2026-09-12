import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { JwtPayload } from '../middleware/auth';
import { Role } from '@prisma/client';

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  const refreshTokenRaw = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  // Update online status
  await prisma.user.update({ where: { id: user.id }, data: { isOnline: true, lastSeen: new Date() } });

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function refreshAccessToken(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { tokenHash } });
    throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Invalid or expired refresh token');
  }

  const payload: JwtPayload = {
    userId: stored.user.id,
    email: stored.user.email,
    role: stored.user.role,
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return {
    accessToken,
    user: { id: stored.user.id, email: stored.user.email, name: stored.user.name, role: stored.user.role },
  };
}

export async function logoutUser(rawToken: string, userId: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  await prisma.user.update({ where: { id: userId }, data: { isOnline: false, lastSeen: new Date() } });
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: Role
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'Email already in use');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role },
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
