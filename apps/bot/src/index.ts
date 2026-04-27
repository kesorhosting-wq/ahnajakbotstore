import 'dotenv/config';
import fetch from 'node-fetch';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events, GatewayIntentBits, ModalBuilder, REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { minecraftUsernameSchema, small } from '@ahnajakmc/shared';

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID!;
const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || process.env.ADMIN_ROLE_ID || '';
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function api(path: string, init?: any) { const r = await fetch(`${apiBaseUrl}${path}`, init); if (!r.ok) throw new Error(await r.text()); return r.json(); }
function isAdmin(member: any) { return member?.permissions?.has?.('Administrator') || (adminRoleId && member?.roles?.cache?.has(adminRoleId)); }
async function register() { const commands = [new SlashCommandBuilder().setName('setup').setDescription('ᴘᴏꜱᴛ ᴀʜɴᴀᴊᴀᴋᴍᴄ ꜱᴛᴏʀᴇ ᴜɪ ɪɴ ᴛʜɪꜱ ᴄʜᴀɴɴᴇʟ')].map(c=>c.toJSON()); const rest = new REST({ version:'10' }).setToken(token); await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body:commands }); }
async function storePayload(guild_id: string) { return api(`/api/public/store/${guild_id}`); }
async function buildStore(guild_id: string) {
  const data = await storePayload(guild_id);
  const s = data.settings || {};
  const embed = new EmbedBuilder().setTitle(small(s.store_name || 'AhnajakMC Store')).setDescription(s.description || 'ᴄʜᴏᴏꜱᴇ ᴀ ᴄᴀᴛᴇɢᴏʀʏ ᴛᴏ ʙᴜʏ.').setColor(0xD4AF37);
  if (s.banner_url) embed.setImage(`${apiBaseUrl}${s.banner_url}`);
  if (s.logo_url) embed.setThumbnail(`${apiBaseUrl}${s.logo_url}`);
  const rows: any[] = [];
  const catButtons = (data.categories || []).slice(0, 4).map((c:any) => new ButtonBuilder().setCustomId(`cat:${c.id}`).setLabel(small(c.name).slice(0,80)).setStyle(ButtonStyle.Primary));
  if (catButtons.length) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...catButtons));
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('howto').setLabel('ʜᴏᴡ ᴛᴏ ᴜꜱᴇ').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('terms').setLabel('ᴛᴇʀᴍꜱ & ᴘʀɪᴠᴀᴄʏ').setStyle(ButtonStyle.Secondary)));
  return { embeds:[embed], components:rows };
}
client.once(Events.ClientReady, async c => { console.log(`AhnajakMC Store bot online as ${c.user.tag}`); await register(); });
client.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand() && i.commandName === 'setup') {
      if (!isAdmin(i.member)) return i.reply({ content:'❌ ᴀᴅᴍɪɴ ᴏɴʟʏ.', ephemeral:true });
      const msg = await buildStore(i.guildId!); await i.channel?.send(msg as any); return i.reply({ content:'✅ ꜱᴛᴏʀᴇ ᴜɪ ᴘᴏꜱᴛᴇᴅ.', ephemeral:true });
    }
    if (i.isButton() && i.customId === 'howto') { const data = await storePayload(i.guildId!); return i.reply({ content: data.settings?.how_to_use || 'ɴᴏ ɢᴜɪᴅᴇ ꜱᴇᴛ.', ephemeral:true }); }
    if (i.isButton() && i.customId === 'terms') { const data = await storePayload(i.guildId!); return i.reply({ content: data.settings?.terms_privacy || 'ɴᴏ ᴛᴇʀᴍꜱ ꜱᴇᴛ.', ephemeral:true }); }
    if (i.isButton() && i.customId.startsWith('cat:')) {
      const catId = i.customId.split(':')[1]; const data = await storePayload(i.guildId!); const products = (data.products || []).filter((p:any)=>p.category_id===catId).slice(0,25);
      if (!products.length) return i.reply({ content:'ɴᴏ ᴘʀᴏᴅᴜᴄᴛꜱ ɪɴ ᴛʜɪꜱ ᴄᴀᴛᴇɢᴏʀʏ.', ephemeral:true });
      const menu = new StringSelectMenuBuilder().setCustomId('buyselect').setPlaceholder('ᴄʜᴏᴏꜱᴇ ᴘʀᴏᴅᴜᴄᴛ').addOptions(products.map((p:any)=>({ label:p.name.slice(0,100), value:p.id, description:`$${p.price}`.slice(0,100) })));
      return i.reply({ content:'ꜱᴇʟᴇᴄᴛ ᴘʀᴏᴅᴜᴄᴛ ᴛᴏ ʙᴜʏ:', components:[new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)], ephemeral:true });
    }
    if (i.isStringSelectMenu() && i.customId === 'buyselect') {
      const productId = i.values[0]; const modal = new ModalBuilder().setCustomId(`buy:${productId}`).setTitle('ᴀʜɴᴀᴊᴀᴋᴍᴄ ꜱᴛᴏʀᴇ');
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('username').setLabel('ᴍɪɴᴇᴄʀᴀꜰᴛ ᴜꜱᴇʀɴᴀᴍᴇ').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)));
      return i.showModal(modal);
    }
    if (i.isModalSubmit() && i.customId.startsWith('buy:')) {
      const product_id = i.customId.split(':')[1]; const username = i.fields.getTextInputValue('username'); const ok = minecraftUsernameSchema.safeParse(username); if (!ok.success) return i.reply({ content:'❌ ɪɴᴠᴀʟɪᴅ ᴜꜱᴇʀɴᴀᴍᴇ.', ephemeral:true });
      const order = await api('/api/orders/create', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ guild_id:i.guildId, product_id, username }) });
      const embed = new EmbedBuilder().setTitle('💳 ᴋʜǫʀ ᴘᴀʏᴍᴇɴᴛ').setDescription(`ᴏʀᴅᴇʀ: ${order.orderId}\nᴘʟᴀʏᴇʀ: ${username}\nᴀᴍᴏᴜɴᴛ: $${order.product.price}\n\nꜱᴄᴀɴ ǫʀ ᴛᴏ ᴘᴀʏ.`).setColor(0xD4AF37);
      if (order.khqr?.qrCodeData) embed.setImage(order.khqr.qrCodeData);
      return i.reply({ embeds:[embed], ephemeral:true });
    }
  } catch (e:any) { console.error(e); if (i.isRepliable()) return i.reply({ content:`❌ ${e.message || 'error'}`.slice(0,1900), ephemeral:true }).catch(()=>{}); }
});
client.login(token);
