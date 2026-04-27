import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fetch from 'node-fetch';
import multer from 'multer';
import { supabase } from './supabase.js';
import { validateMinecraftUsername, orderId, publicOrigin, MAIN_OWNER_DISCORD_ID } from './utils.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 }});
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const PORT = process.env.PORT || 3001;
const WEB_BASE_URL = process.env.WEB_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
const DISCORD_API = 'https://discord.com/api/v10';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-change-me';
const SESSION_MAX_AGE_MS = 7 * 86400_000;

function signSessionValue(value){
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function encodeSession(payload){
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${signSessionValue(body)}`;
}

function decodeSession(token){
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature) return null;
  const expected = signSessionValue(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

function sessionCookie(res, profile){
  const value = encodeSession({
    id: profile.id,
    discord_id: profile.discord_id,
    username: profile.username,
    role: profile.role,
    exp: Date.now() + SESSION_MAX_AGE_MS,
  });
  res.cookie('ams_session', value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: String(process.env.PUBLIC_BASE_URL || '').startsWith('https'),
    maxAge: SESSION_MAX_AGE_MS,
  });
}
function getSession(req){
  try { return decodeSession(req.cookies.ams_session || ''); } catch { return null; }
}
async function auth(req,res,next){
  const s = getSession(req); if(!s) return res.status(401).json({error:'Not logged in'});
  req.user=s; next();
}
async function admin(req,res,next){
  const s=getSession(req); if(!s) return res.status(401).json({error:'Not logged in'});
  if(s.discord_id === MAIN_OWNER_DISCORD_ID || s.role === 'owner' || s.role === 'admin'){req.user=s;return next();}
  return res.status(403).json({error:'Admin only'});
}
async function audit(actor, action, data={}){ await supabase.from('audit_logs').insert({ actor_discord_id: actor, action, data }); }

app.get(['/api/health','/health'],(_,res)=>res.json({ok:true,name:'AhnajakMC Store Backend'}));

app.get(['/api/auth/discord','/auth/discord'], (req,res)=>{
  const params = new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID, redirect_uri: process.env.DISCORD_REDIRECT_URI || `${publicOrigin(req)}/api/auth/discord/callback`, response_type:'code', scope:'identify' });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

app.get(['/api/auth/discord/callback','/auth/discord/callback'], async (req,res)=>{
  try{
    const code=req.query.code; if(!code) return res.redirect(`${WEB_BASE_URL}/login?error=no_code`);
    const tokenRes=await fetch(`${DISCORD_API}/oauth2/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:process.env.DISCORD_REDIRECT_URI || `${publicOrigin(req)}/api/auth/discord/callback`})});
    const token=await tokenRes.json(); if(!token.access_token) return res.redirect(`${WEB_BASE_URL}/login?error=token`);
    const meRes=await fetch(`${DISCORD_API}/users/@me`,{headers:{Authorization:`Bearer ${token.access_token}`}});
    const me=await meRes.json();
    const role = me.id === MAIN_OWNER_DISCORD_ID ? 'owner' : 'user';
    const { data: existing } = await supabase.from('profiles').select('*').eq('discord_id', me.id).maybeSingle();
    const payload={ discord_id:me.id, username:me.username, avatar:me.avatar, role: existing?.role || role, updated_at:new Date().toISOString() };
    const { data: profile, error } = await supabase.from('profiles').upsert(payload,{onConflict:'discord_id'}).select().single();
    if(error) throw error;
    sessionCookie(res, profile); await audit(me.id,'login',{username:me.username});
    res.redirect(`${WEB_BASE_URL}/admin`);
  }catch(e){ console.error(e); res.redirect(`${WEB_BASE_URL}/login?error=server`); }
});
app.post(['/api/auth/logout','/auth/logout'],(_,res)=>{res.clearCookie('ams_session');res.json({ok:true});});
app.get('/api/me', auth, (req,res)=>res.json({user:req.user}));

app.get('/api/public/store', async (_,res)=>{
  const [{data:settings},{data:categories},{data:products}] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id',1).single(),
    supabase.from('categories').select('*').eq('enabled',true).order('sort_order'),
    supabase.from('products').select('*').eq('enabled',true).order('created_at')
  ]);
  res.json({settings,categories,products});
});

app.get('/api/admin/bootstrap', admin, async (_,res)=>{
  const [settings, servers, categories, products, users, orders] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id',1).single(), supabase.from('minecraft_servers').select('*').order('created_at'), supabase.from('categories').select('*').order('sort_order'), supabase.from('products').select('*').order('created_at'), supabase.from('profiles').select('*').order('created_at'), supabase.from('orders').select('*, products(name)').order('created_at',{ascending:false}).limit(50)
  ]);
  res.json({settings:settings.data, servers:servers.data, categories:categories.data, products:products.data, users:users.data, orders:orders.data});
});
app.put('/api/admin/settings', admin, async (req,res)=>{ const {data,error}=await supabase.from('store_settings').update({...req.body,updated_at:new Date().toISOString()}).eq('id',1).select().single(); if(error)return res.status(400).json({error:error.message}); await audit(req.user.discord_id,'settings.update',req.body); res.json(data); });
function crud(table){
  app.post(`/api/admin/${table}`, admin, async (req,res)=>{ const {data,error}=await supabase.from(table).insert(req.body).select().single(); if(error)return res.status(400).json({error:error.message}); await audit(req.user.discord_id,`${table}.create`,data); res.json(data); });
  app.put(`/api/admin/${table}/:id`, admin, async (req,res)=>{ const {data,error}=await supabase.from(table).update(req.body).eq('id',req.params.id).select().single(); if(error)return res.status(400).json({error:error.message}); await audit(req.user.discord_id,`${table}.update`,{id:req.params.id}); res.json(data); });
  app.delete(`/api/admin/${table}/:id`, admin, async (req,res)=>{ const {error}=await supabase.from(table).delete().eq('id',req.params.id); if(error)return res.status(400).json({error:error.message}); await audit(req.user.discord_id,`${table}.delete`,{id:req.params.id}); res.json({ok:true}); });
}
['minecraft_servers','categories','products'].forEach(crud);

app.put('/api/admin/users/:id/role', admin, async (req,res)=>{ const {role}=req.body; const {data,error}=await supabase.from('profiles').update({role}).eq('id',req.params.id).select().single(); if(error)return res.status(400).json({error:error.message}); await audit(req.user.discord_id,'user.role',{target:req.params.id,role}); res.json(data); });
app.post('/api/admin/users/:id/login-as', admin, async (req,res)=>{ const {data,error}=await supabase.from('profiles').select('*').eq('id',req.params.id).single(); if(error)return res.status(404).json({error:'User not found'}); sessionCookie(res,data); await audit(req.user.discord_id,'user.login_as',{target:data.discord_id}); res.json({ok:true,user:data}); });

app.post('/api/admin/upload', admin, upload.single('file'), async (req,res)=>{
  if(!req.file) return res.status(400).json({error:'No file'});
  const ext=(req.file.originalname.split('.').pop()||'png').replace(/[^a-z0-9]/gi,'').toLowerCase(); const name=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const {error}=await supabase.storage.from('store-assets').upload(name, req.file.buffer, { contentType:req.file.mimetype, upsert:false });
  if(error) return res.status(400).json({error:error.message});
  const {data}=supabase.storage.from('store-assets').getPublicUrl(name); res.json({url:data.publicUrl});
});

app.post('/api/orders/create', async (req,res)=>{
  const {productId, minecraftUsername, discordUserId, discordUsername}=req.body;
  if(!validateMinecraftUsername(minecraftUsername)) return res.status(400).json({error:'Invalid Minecraft username'});
  const {data: product, error:pErr}=await supabase.from('products').select('*, minecraft_servers(*)').eq('id',productId).eq('enabled',true).single();
  if(pErr || !product) return res.status(404).json({error:'Product not found'});
  const {data:settings}=await supabase.from('store_settings').select('*').eq('id',1).single();
  const id=orderId();
  const callbackUrl=`${process.env.PUBLIC_BASE_URL || ''}/api/payment/callback/${id}`;
  const khqrRes=await fetch(`${process.env.KHQR_API_URL || 'http://157.10.73.20:7777'}/generate-khqr`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:Number(product.price),transactionId:id,email:`${discordUserId || 'discord'}@discord.local`,username:minecraftUsername,callbackUrl,secret:settings?.webhook_secret || process.env.DEFAULT_WEBHOOK_SECRET,merchantName:settings?.merchant_name,merchantId:settings?.merchant_id})});
  const khqr=await khqrRes.json(); if(!khqrRes.ok) return res.status(400).json({error:khqr.error || 'KHQR error'});
  await supabase.from('orders').insert({id,discord_user_id:discordUserId,discord_username:discordUsername,minecraft_username:minecraftUsername,product_id:product.id,server_id:product.server_id,amount:product.price,status:'pending',khqr_md5:khqr.md5});
  res.json({orderId:id, qrCodeData:khqr.qrCodeData, md5:khqr.md5, product});
});

app.post('/api/payment/callback/:orderId', async (req,res)=>{
  const auth=req.headers.authorization || ''; const {data:settings}=await supabase.from('store_settings').select('*').eq('id',1).single();
  const expected=settings?.webhook_secret || process.env.DEFAULT_WEBHOOK_SECRET;
  if(expected && auth !== `Bearer ${expected}`) return res.status(401).json({error:'Bad webhook secret'});
  const orderId=req.params.orderId;
  const {transaction_id, amount}=req.body;
  const {data:order,error}=await supabase.from('orders').update({status:'paid',bakong_transaction_id:transaction_id,paid_at:new Date().toISOString()}).eq('id',orderId).select('*, products(*), minecraft_servers(*)').single();
  if(error) return res.status(400).json({error:error.message});
  await sendToPlugin(order);
  res.json({ok:true});
});

async function sendToPlugin(order){
  const server=order.minecraft_servers; const product=order.products;
  if(!server?.api_base_url){ await supabase.from('orders').update({status:'paid',plugin_response:{note:'Plugin URL not configured yet'}}).eq('id',order.id); return; }
  try{
    const r=await fetch(`${server.api_base_url.replace(/\/$/,'')}/ahnajak/reward`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${server.plugin_api_key}`},body:JSON.stringify({orderId:order.id,username:order.minecraft_username,productId:product.id,productName:product.name,command:product.minecraft_command,amount:order.amount})});
    const text=await r.text();
    await supabase.from('orders').update({status:r.ok?'sent_to_plugin':'failed',sent_at:new Date().toISOString(),plugin_response:{status:r.status,body:text}}).eq('id',order.id);
  }catch(e){ await supabase.from('orders').update({status:'failed',plugin_response:{error:e.message}}).eq('id',order.id); }
}

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT,()=>console.log(`AhnajakMC backend on ${PORT}`));
}
