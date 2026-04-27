import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
const commands=[new SlashCommandBuilder().setName('setup').setDescription('ᴘᴏꜱᴛ ᴀʜɴᴀᴊᴀᴋᴍᴄ ꜱᴛᴏʀᴇ ᴜɪ').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).toJSON()];
const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
const route=process.env.DISCORD_GUILD_ID?Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID,process.env.DISCORD_GUILD_ID):Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
await rest.put(route,{body:commands});
console.log('Commands deployed');
