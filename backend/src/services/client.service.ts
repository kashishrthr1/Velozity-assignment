import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getAllClients() {
  return prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({ where: { id }, include: { projects: true } });
  if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');
  return client;
}

export async function createClient(data: { name: string; email: string; phone?: string; company: string }) {
  const existing = await prisma.client.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'Client with this email already exists');
  return prisma.client.create({ data });
}

export async function updateClient(id: string, data: { name?: string; email?: string; phone?: string; company?: string }) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');
  return prisma.client.update({ where: { id }, data });
}

export async function deleteClient(id: string) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');
  await prisma.client.delete({ where: { id } });
}
