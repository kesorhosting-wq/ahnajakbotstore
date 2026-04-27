export function validateMinecraftUsername(name){return /^[A-Za-z0-9_]{3,16}$/.test(String(name||''));}
export function orderId(){return `ORD-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;}
export function publicOrigin(req){return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;}
export const MAIN_OWNER_DISCORD_ID = process.env.MAIN_OWNER_DISCORD_ID || '1446502651637534772';
