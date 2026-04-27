# ᴀʜɴᴀᴊᴀᴋᴍᴄ ꜱᴛᴏʀᴇ — Discord Bot + Website + Supabase

This package contains the **Discord bot**, **admin website**, and **backend API**. The Minecraft plugin is intentionally not included yet.

## What is included

- Discord bot: `/setup` posts the store UI into the current channel.
- Dynamic category buttons and product menu from Supabase.
- KHQR payment using your API: `POST /generate-khqr`.
- Admin website with Discord OAuth login.
- Main owner support: Discord user ID `1446502651637534772` is owner by default.
- User tab with role management and `Login as` support.
- Supabase PostgreSQL database.
- Vercel-ready web frontend.
- Backend ready for VPS, Railway, Render, or any Node host.

## Important security note

You shared live Supabase keys in chat. Rotate the Service Role key and project DB password before production. Do **not** commit `.env`.

## Setup

1. Open Supabase SQL editor.
2. Run `supabase/schema.sql`.
3. Optional image uploads: run `supabase/storage.sql` and create/confirm bucket `store-assets`.
4. Copy `.env.example` to `.env` for backend and bot hosts.
5. Fill your real values.

## Environment values

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PUBLIC_BASE_URL=https://api.yourdomain.com
WEB_BASE_URL=https://store.yourdomain.com
MAIN_OWNER_DISCORD_ID=1446502651637534772

DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_GUILD_ID=your_guild_id_optional_for_fast_dev
DISCORD_ADMIN_ROLE_ID=your_admin_role_id
DISCORD_REDIRECT_URI=https://api.yourdomain.com/auth/discord/callback
SESSION_SECRET=change_me_long_random

KHQR_API_URL=http://157.10.73.20:7777
KHQR_WS_URL=ws://157.10.73.20:8080
DEFAULT_WEBHOOK_SECRET=Jes-dak-dak-mk-ka-pea-ey-jg-hah

BACKEND_INTERNAL_URL=https://api.yourdomain.com
BACKEND_INTERNAL_SECRET=change_me_backend_bot_secret
```

## Local run

```bash
npm run install:all
npm run dev:backend
npm run dev:web
npm --prefix apps/bot run deploy
npm run dev:bot
```

## Vercel website deploy

Deploy only `apps/web` to Vercel.

Set environment variable in Vercel:

```env
VITE_API_URL=https://api.yourdomain.com
```

The bot should **not** run on Vercel because Discord bots need a long-running process. Host the bot on a VPS, Pterodactyl node, Railway worker, Render worker, or PM2.

## Backend deploy

Host `apps/backend` on VPS/Railway/Render. It must have a public HTTPS URL because Discord OAuth and KHQR callback need it.

## Bot deploy

Host `apps/bot` as a long-running Node.js app. Run once:

```bash
npm --prefix apps/bot run deploy
```

Then start:

```bash
npm --prefix apps/bot start
```

## Future plugin contract

After payment success, backend will call:

```txt
POST {plugin_api_base_url}/ahnajak/reward
Authorization: Bearer {plugin_api_key}
```

Body:

```json
{
  "orderId": "ORD-xxxxx",
  "username": "BlazerxXx",
  "productId": "uuid",
  "productName": "VIP",
  "command": "lp user %player% parent add vip",
  "amount": 5
}
```

Future plugin must handle:

- If player online: instant reward.
- If offline: save to plugin `data.yml`.
- On join or `/check`: give pending rewards.
- Website database only stores payment/order status, not reward queue.
