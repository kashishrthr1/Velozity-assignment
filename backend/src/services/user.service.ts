import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';
import * as authService from './auth.service';

export async function getAllUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isOnline: true, lastSeen: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isOnline: true, lastSeen: true, createdAt: true },
  });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  return user;
}

export async function createUser(data: { email: string; password: string; name: string; role: Role }) {
  return authService.registerUser(data.email, data.password, data.name, data.role);
}

export async function updateUser(id: string, data: { name?: string; email?: string; role?: Role }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  await prisma.user.delete({ where: { id } });
}

export async function getDeveloperUsers() {
  return prisma.user.findMany({
    where: { role: 'DEVELOPER' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
}
