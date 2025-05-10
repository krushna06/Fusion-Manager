import { Client, GatewayIntentBits, Partials, PermissionsBitField, SlashCommandBuilder, Routes, REST } from 'discord.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.resolve('./config.json'), 'utf-8'));
const TOKEN = config.TOKEN;
const MEDIA_ROLE = config.MEDIA_ROLE;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

const commands = [
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user for a specified duration (in seconds)')
    .addUserOption(option => option.setName('user').setDescription('User to timeout').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in seconds').setRequired(true)),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true)),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true)),
  new SlashCommandBuilder()
    .setName('syncyoutubers')
    .setDescription('List YouTube accounts of users with MEDIA_ROLE')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'timeout') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'You do not have permission to timeout members.', ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration') * 1000;
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    try {
      await member.timeout(duration);
      interaction.reply({ content: `${user.tag} has been timed out for ${duration / 1000} seconds.` });
    } catch (err) {
      interaction.reply({ content: `Failed to timeout user: ${err.message}`, ephemeral: true });
    }
  }

  if (interaction.commandName === 'kick') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: 'You do not have permission to kick members.', ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    try {
      await member.kick();
      interaction.reply({ content: `${user.tag} has been kicked.` });
    } catch (err) {
      interaction.reply({ content: `Failed to kick user: ${err.message}`, ephemeral: true });
    }
  }

  if (interaction.commandName === 'ban') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'You do not have permission to ban members.', ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    try {
      await member.ban();
      interaction.reply({ content: `${user.tag} has been banned.` });
    } catch (err) {
      interaction.reply({ content: `Failed to ban user: ${err.message}`, ephemeral: true });
    }
  }

  if (interaction.commandName === 'syncyoutubers') {
    await interaction.deferReply({ ephemeral: true });
    const fields = [];
    try {
      await interaction.guild.members.fetch();
      const membersWithRole = interaction.guild.members.cache.filter(m => m.roles.cache.has(MEDIA_ROLE));
      if (membersWithRole.size === 0) {
        await interaction.editReply({ content: 'No users found with the media role.' });
        return;
      }
      for (const [userId, member] of membersWithRole) {
        try {
          const res = await fetch(`https://dcdn.nostep.xyz/profile/${userId}`);
          if (!res.ok) {
            fields.push({ name: member.user?.username || userId, value: `<@${userId}>: Failed to fetch profile.`, inline: false });
            continue;
          }
          const data = await res.json();
          const connected = data.connected_accounts || [];
          const youtube = connected.find(acc => acc.type === 'youtube');
          const tiktok = connected.find(acc => acc.type === 'tiktok');
          let links = [];
          if (youtube) {
            let ytUrl = '';
            if (youtube.id && youtube.id.startsWith('UC')) {
              ytUrl = `https://www.youtube.com/channel/${youtube.id}`;
            } else if (youtube.name) {
              ytUrl = `https://www.youtube.com/@${youtube.name}`;
            }
            if (ytUrl) links.push(`[YouTube](${ytUrl})`);
          }
          if (tiktok) links.push(`[TikTok](https://www.tiktok.com/@${tiktok.name})`);
          let value = `<@${userId}> : `;
          if (links.length > 0) {
            value += links.join(' - ');
          } else {
            value += 'No YouTube or TikTok accounts found.';
          }
          fields.push({ name: member.user?.username || userId, value, inline: false });
        } catch (err) {
          fields.push({ name: member.user?.username || userId, value: `<@${userId}>: Error fetching profile.`, inline: false });
        }
      }
      await interaction.editReply({
        embeds: [{
          title: 'Media Role Accounts',
          color: 0x2F3136,
          fields: fields.length > 0 ? fields : [{ name: 'No Results', value: 'No users found or no accounts linked.' }],
        }]
      });
    } catch (err) {
      await interaction.editReply({ content: `Failed to fetch members or profiles: ${err.message}` });
    }
  }
});

client.login(TOKEN);
