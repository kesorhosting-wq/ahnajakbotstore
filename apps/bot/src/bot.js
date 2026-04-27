import 'dotenv/config';
import fetch from 'node-fetch';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';

const client=new Client({intents:[GatewayIntentBits.Guilds]});
const API=process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';
const ADMIN_ROLE_ID=process.env.DISCORD_ADMIN_ROLE_ID;
const OWNER_ID=process.env.MAIN_OWNER_DISCORD_ID || '1446502651637534772';

async function api(path, options={}){ const r=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json','x-internal-secret':process.env.BACKEND_INTERNAL_SECRET || 'dev',...(options.headers||{})}}); const text=await r.text(); try{return JSON.parse(text)}catch{return {raw:text}} }
function hasAdmin(member){ return member?.id===OWNER_ID || member?.roles?.cache?.has(ADMIN_ROLE_ID) || member?.permissions?.has('ManageGuild'); }
function goldEmbed(settings){ return new EmbedBuilder().setColor(0xD4AF37).setTitle(settings?.store_name || 'ᴀʜɴᴀᴊᴀᴋᴍᴄ ꜱᴛᴏʀᴇ').setDescription(settings?.description || 'ꜱᴇʟᴇᴄᴛ ᴀ ᴄᴀᴛᴇɢᴏʀʏ ᴛᴏ ʙᴜʏ.').setImage(settings?.banner_url || null).setThumbnail(settings?.logo_url || null).setFooter({text:'ᴀʜɴᴀᴊᴀᴋᴍᴄ ꜱᴛᴏʀᴇ • ꜱᴇᴄᴜʀᴇ ᴋʜǫʀ ᴘᴀʏᴍᴇɴᴛ'}); }
async function storeComponents(){ const store=await api('/api/public/store'); const rows=[]; let current=new ActionRowBuilder(); for(const c of store.categories || []){ if(current.components.length===5){rows.push(current);current=new ActionRowBuilder();} current.addComponents(new ButtonBuilder().setCustomId(`cat:${c.id}`).setLabel(c.name).setStyle(ButtonStyle.Primary)); } if(current.components.length) rows.push(current); rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('howto').setLabel('ʜᴏᴡ ᴛᴏ ᴜꜱᴇ').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('terms').setLabel('ᴛᴇʀᴍꜱ & ᴘʀɪᴠᴀᴄʏ').setStyle(ButtonStyle.Secondary))); return {store, rows}; }

client.once('ready',()=>console.log(`Logged in as ${client.user.tag}`));
client.on('interactionCreate', async i=>{
  try{
    if(i.isChatInputCommand() && i.commandName==='setup'){
      if(!hasAdmin(i.member)) return i.reply({content:'❌ ʏᴏᴜ ᴅᴏ ɴᴏᴛ ʜᴀᴠᴇ ᴘᴇʀᴍɪꜱꜱɪᴏɴ.',ephemeral:true});
      const {store,rows}=await storeComponents();
      await i.channel.send({embeds:[goldEmbed(store.settings)],components:rows});
      return i.reply({content:'✅ ꜱᴛᴏʀᴇ ᴜɪ ᴘᴏꜱᴛᴇᴅ.',ephemeral:true});
    }
    if(i.isButton() && i.customId==='howto'){ const {store}=await storeComponents(); return i.reply({embeds:[new EmbedBuilder().setColor(0xD4AF37).setTitle('ʜᴏᴡ ᴛᴏ ᴜꜱᴇ').setDescription(store.settings?.how_to_use || 'ɴᴏ ɢᴜɪᴅᴇ ꜱᴇᴛ.')],ephemeral:true}); }
    if(i.isButton() && i.customId==='terms'){ const {store}=await storeComponents(); return i.reply({embeds:[new EmbedBuilder().setColor(0xD4AF37).setTitle('ᴛᴇʀᴍꜱ & ᴘʀɪᴠᴀᴄʏ').setDescription(store.settings?.terms_privacy || 'ɴᴏ ᴛᴇʀᴍꜱ ꜱᴇᴛ.')],ephemeral:true}); }
    if(i.isButton() && i.customId.startsWith('cat:')){
      const catId=i.customId.split(':')[1]; const store=await api('/api/public/store'); const products=(store.products||[]).filter(p=>p.category_id===catId);
      if(!products.length) return i.reply({content:'❌ ɴᴏ ᴘʀᴏᴅᴜᴄᴛꜱ ɪɴ ᴛʜɪꜱ ᴄᴀᴛᴇɢᴏʀʏ.',ephemeral:true});
      const menu=new StringSelectMenuBuilder().setCustomId('product_select').setPlaceholder('ꜱᴇʟᴇᴄᴛ ᴘʀᴏᴅᴜᴄᴛ').addOptions(products.slice(0,25).map(p=>({label:p.name.slice(0,100),description:`$${Number(p.price).toFixed(2)}`.slice(0,100),value:p.id})));
      return i.reply({embeds:[new EmbedBuilder().setColor(0xD4AF37).setTitle('ꜱᴇʟᴇᴄᴛ ᴘʀᴏᴅᴜᴄᴛ').setDescription(products.map(p=>`**${p.name}** — $${Number(p.price).toFixed(2)}\n${p.description||''}`).join('\n\n').slice(0,4000))],components:[new ActionRowBuilder().addComponents(menu)],ephemeral:true});
    }
    if(i.isStringSelectMenu() && i.customId==='product_select'){
      const productId=i.values[0]; const modal=new ModalBuilder().setCustomId(`buy:${productId}`).setTitle('ᴀʜɴᴀᴊᴀᴋᴍᴄ ᴘᴜʀᴄʜᴀꜱᴇ');
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('username').setLabel('ᴍɪɴᴇᴄʀᴀꜰᴛ ᴜꜱᴇʀɴᴀᴍᴇ').setStyle(TextInputStyle.Short).setMinLength(3).setMaxLength(16).setRequired(true)));
      return i.showModal(modal);
    }
    if(i.isModalSubmit() && i.customId.startsWith('buy:')){
      await i.deferReply({ephemeral:true}); const productId=i.customId.split(':')[1]; const username=i.fields.getTextInputValue('username');
      const order=await api('/api/orders/create',{method:'POST',body:JSON.stringify({productId,minecraftUsername:username,discordUserId:i.user.id,discordUsername:i.user.username})});
      if(order.error) return i.editReply(`❌ ${order.error}`);
      const embed=new EmbedBuilder().setColor(0xD4AF37).setTitle('ꜱᴄᴀɴ ᴋʜǫʀ ᴛᴏ ᴘᴀʏ').setDescription(`**ᴏʀᴅᴇʀ:** ${order.orderId}\n**ᴘʟᴀʏᴇʀ:** ${username}\n**ᴘʀᴏᴅᴜᴄᴛ:** ${order.product.name}\n**ᴘʀɪᴄᴇ:** $${Number(order.product.price).toFixed(2)}\n\nᴀꜰᴛᴇʀ ᴘᴀʏᴍᴇɴᴛ, ᴅᴇʟɪᴠᴇʀʏ ᴡɪʟʟ ʙᴇ ᴀᴜᴛᴏᴍᴀᴛɪᴄ.`).setImage('attachment://khqr.png');
      const base64=String(order.qrCodeData).split(',')[1]; const file=new AttachmentBuilder(Buffer.from(base64,'base64'),{name:'khqr.png'});
      return i.editReply({embeds:[embed],files:[file]});
    }
  }catch(e){ console.error(e); if(i.deferred||i.replied) i.editReply('❌ ᴇʀʀᴏʀ. ᴄʜᴇᴄᴋ ᴄᴏɴꜱᴏʟᴇ.'); else i.reply({content:'❌ ᴇʀʀᴏʀ.',ephemeral:true}); }
});
client.login(process.env.DISCORD_TOKEN);
