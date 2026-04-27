import { z } from 'zod';
export const small = (text: string) => text.replace(/[A-Za-z]/g, (c) => ({A:'ᴀ',B:'ʙ',C:'ᴄ',D:'ᴅ',E:'ᴇ',F:'ꜰ',G:'ɢ',H:'ʜ',I:'ɪ',J:'ᴊ',K:'ᴋ',L:'ʟ',M:'ᴍ',N:'ɴ',O:'ᴏ',P:'ᴘ',Q:'ǫ',R:'ʀ',S:'ꜱ',T:'ᴛ',U:'ᴜ',V:'ᴠ',W:'ᴡ',X:'x',Y:'ʏ',Z:'ᴢ'} as Record<string,string>)[c.toUpperCase()] || c);
export const minecraftUsernameSchema = z.string().regex(/^[a-zA-Z0-9_]{3,16}$/, 'Minecraft username must be 3-16 chars: letters, numbers, underscore only.');
export const orderStatus = z.enum(['pending','paid','plugin_sent','plugin_failed','cancelled','expired']);
export type OrderStatus = z.infer<typeof orderStatus>;
export const newOrderId = () => `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
