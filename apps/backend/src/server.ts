import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fetch from 'node-fetch';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { newOrderId, minecraftUsernameSchema } from '@ahnajakmc/shared';
import { env } from './env.js';
import { supabase } from './supabase.js';
import { requireAdmin, readSession, signSession, upsertUser } from './auth.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: path.join(process.cwd(), 'uploads'), limits: { fileSize: 4 * 1024 * 1024 }});
app.use(cors({ origin: env.appBaseUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_, res) => res.json({ ok:true, name:'AhnajakMC Store API' }));
app.get('/api/auth/discord/login', (_, res) => {
  const params = new URLSearchParams({ client_id: env.discordClientId, redirect_uri: env.discordRedirectUri, response_type:'code', scope:'identify' });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});
app.get('/api/auth/discord/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.discordClientId, client_secret: env.discordClientSecret, grant_type:'authorization_code', code, redirect_uri: env.discordRedirectUri }) });
  if (!tokenRes.ok) return res.redirect(`${env.appBaseUrl}/login?error=discord_token`);
  const token = await tokenRes.json() as any;
  const userRes = await fetch('https://discord.com/api/users/@me', { headers:{ Authorization:`Bearer ${token.access_token}` }});
  if (!userRes.ok) return res.redirect(`${env.appBaseUrl}/login?error=discord_user`);
  const discordUser = await userRes.json();
  const sessionUser = await upsertUser(discordUser);
  res.cookie('session', signSession(sessionUser), { httpOnly:true, sameSite:'lax', secure: env.appBaseUrl.startsWith('https'), maxAge: 7*86400*1000 });
  res.redirect(`${env.appBaseUrl}/admin`);
});
app.post('/api/auth/logout', (_, res) => { res.clearCookie('session'); res.json({ ok:true }); });
app.get('/api/me', (req, res) => res.json({ user: readSession(req) }));

app.get('/api/public/store/:guildId', async (req, res) => {
  const guild_id = req.params.guildId;
  const [settings, categories, products] = await Promise.all([
    supabase.from('settings').select('*').eq('guild_id', guild_id).maybeSingle(),
    supabase.from('categories').select('*').eq('guild_id', guild_id).eq('enabled', true).order('sort_order'),
    supabase.from('products').select('*').eq('guild_id', guild_id).eq('enabled', true).order('sort_order')
  ]);
  res.json({ settings: settings.data, categories: categories.data || [], products: products.data || [] });
});

app.get('/api/admin/bootstrap', requireAdmin, async (req, res) => {
  const guild_id = process.env.DISCORD_GUILD_ID || 'default';
  await supabase.from('settings').upsert({ guild_id, store_name:'AhnajakMC Store', description:'ᴍᴏᴅᴇʀɴ ᴍɪɴᴇᴄʀᴀꜰᴛ ꜱᴛᴏʀᴇ', how_to_use:'1. ᴄʜᴏᴏꜱᴇ ᴘʀᴏᴅᴜᴄᴛ\n2. ꜱᴄᴀɴ ᴋʜǫʀ\n3. ᴡᴀɪᴛ ꜰᴏʀ ᴀᴜᴛᴏ ᴅᴇʟɪᴠᴇʀʏ', terms_privacy:'ᴀʟʟ ᴘᴀʏᴍᴇɴᴛꜱ ᴀʀᴇ ꜰɪɴᴀʟ. ᴄᴏɴᴛᴀᴄᴛ ꜱᴛᴀꜰꜰ ꜰᴏʀ ꜱᴜᴘᴘᴏʀᴛ.' }, { onConflict:'guild_id' });
  res.json({ ok:true });
});

app.get('/api/admin/all', requireAdmin, async (_, res) => {
  const q = async (table:string) => (await supabase.from(table).select('*').order('created_at', { ascending:false })).data || [];
  res.json({ settings: await q('settings'), servers: await q('servers'), categories: await q('categories'), products: await q('products'), orders: await q('orders'), users: await q('users') });
});
app.post('/api/admin/:table', requireAdmin, async (req, res) => {
  const table = req.params.table;
  if (!['settings','servers','categories','products'].includes(table)) return res.status(400).json({ error:'bad_table' });
  const { data, error } = await supabase.from(table).upsert(req.body).select().single();
  if (error) return res.status(400).json({ error:error.message });
  res.json({ data });
});
app.post('/api/admin/upload', requireAdmin, upload.single('file'), async (req, res) => res.json({ url: `/uploads/${req.file?.filename}`, original: req.file?.originalname }));
app.post('/api/admin/login-as/:discordId', requireAdmin, async (req, res) => {
  const actor = (req as any).user;
  if (actor.role !== 'owner') return res.status(403).json({ error:'owner_only' });
  const { data } = await supabase.from('users').select('*').eq('discord_id', req.params.discordId).single();
  if (!data) return res.status(404).json({ error:'user_not_found' });
  const token = signSession({ discord_id:data.discord_id, username:data.username, avatar:data.avatar, role:data.role, acting_as: actor.discord_id });
  res.cookie('session', token, { httpOnly:true, sameSite:'lax', secure: env.appBaseUrl.startsWith('https'), maxAge: 3600*1000 });
  res.json({ ok:true });
});

app.post('/api/orders/create', async (req, res) => {
  const schema = z.object({ guild_id:z.string(), product_id:z.string(), username:minecraftUsernameSchema, email:z.string().optional() });
  const parsed = schema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error:parsed.error.flatten() });
  const { guild_id, product_id, username, email } = parsed.data;
  const { data: product } = await supabase.from('products').select('*').eq('id', product_id).eq('enabled', true).single();
  if (!product) return res.status(404).json({ error:'product_not_found' });
  const orderId = newOrderId();
  await supabase.from('orders').insert({ id:orderId, guild_id, product_id, server_id:product.server_id, username, amount:product.price, status:'pending' });
  const callbackUrl = `${env.apiBaseUrl}/api/payments/khqr/callback/${orderId}`;
  const r = await fetch(`${env.khqrApiUrl}/generate-khqr`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ amount:product.price, transactionId:orderId, email, username, callbackUrl, secret:env.khqrWebhookSecret, merchantName:env.khqrMerchantName, merchantId:env.khqrMerchantId }) });
  const khqr = await r.json();
  res.json({ orderId, product, khqr });
});
app.post('/api/payments/khqr/callback/:orderId', async (req, res) => {
  const auth = String(req.headers.authorization || '');
  if (auth !== `Bearer ${env.khqrWebhookSecret}`) return res.status(401).json({ error:'bad_secret' });
  const orderId = req.params.orderId;
  await supabase.from('orders').update({ status:'paid', paid_at:new Date().toISOString(), payment_ref:req.body.transaction_id || null }).eq('id', orderId).neq('status','plugin_sent');
  // Plugin later: backend will send this paid order once to selected server plugin.
  res.json({ ok:true, note:'paid; plugin dispatch will be added when plugin is ready' });
});

app.listen(env.port, () => console.log(`AhnajakMC Store API running on :${env.port}`));
