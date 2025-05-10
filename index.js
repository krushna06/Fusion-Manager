import { Client, GatewayIntentBits, Partials, SlashCommandBuilder, Routes, REST } from 'discord.js';
import config from './config.js';
import fs from 'fs';
import path from 'path';

const TOKEN = config.TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

const commandFiles = fs.readdirSync(path.resolve('./commands')).filter(file => file.endsWith('.js'));
const commandModules = {};
for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  commandModules[command.default.name] = command.default;
}

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
    .setDescription('List YouTube and TikTok accounts of users with MEDIA_ROLE')
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
  const command = commandModules[interaction.commandName];
  if (command) {
    await command.execute(interaction);
  }
});

client.login(TOKEN);
