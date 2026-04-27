import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { env } from './env.js';
import { supabase } from './supabase.js';
export type SessionUser = { discord_id: string; username: string; avatar?: string; role: 'owner'|'admin'|'user'; acting_as?: string };
export function signSession(user: SessionUser) { return jwt.sign(user, env.jwtSecret, { expiresIn: '7d' }); }
export function readSession(req: Request): SessionUser | null { const t = req.cookies?.session || req.headers.authorization?.replace('Bearer ', ''); if (!t) return null; try { return jwt.verify(t, env.jwtSecret) as SessionUser; } catch { return null; } }
export async function requireAdmin(req: Request, res: Response, next: NextFunction) { const u = readSession(req); if (!u) return res.status(401).json({ error:'not_logged_in' }); if (u.role !== 'owner' && u.role !== 'admin') return res.status(403).json({ error:'admin_only' }); (req as any).user = u; next(); }
export async function upsertUser(discordUser: any) {
  const role = discordUser.id === env.ownerDiscordId ? 'owner' : 'user';
  const row = { discord_id: discordUser.id, username: discordUser.username, global_name: discordUser.global_name, avatar: discordUser.avatar, role };
  await supabase.from('users').upsert(row, { onConflict:'discord_id' });
  return { discord_id: discordUser.id, username: discordUser.username, avatar: discordUser.avatar, role } as SessionUser;
}
