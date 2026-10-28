import express from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { verifyPassword, generateToken } from '../../lib/auth';

export const authRouter = express.Router();

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const schema = z.object({
      username: z.string(),
      password: z.string(),
    });

    const { username, password } = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
      },
    });

    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});
