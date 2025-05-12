import { Client, GatewayIntentBits, Partials, SlashCommandBuilder, Routes, REST, EmbedBuilder } from 'discord.js';
import config from './config.js';
import fs from 'fs';
import path from 'path';
import { initDatabase, addBugReport, getBugReportChannel } from './database.js';

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
    .setName('syncmedia')
    .setDescription('List YouTube and TikTok accounts of medias.'),
  new SlashCommandBuilder()
    .setName('bug-report')
    .setDescription('Setup a bug reporting channel for users'),
  new SlashCommandBuilder()
    .setName('bug-accept')
    .setDescription('Accept a bug report')
    .addStringOption(option => option.setName('msg_id').setDescription('Message ID of the bug report').setRequired(true)),
  new SlashCommandBuilder()
    .setName('bug-decline')
    .setDescription('Decline a bug report')
    .addStringOption(option => option.setName('msg_id').setDescription('Message ID of the bug report').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for declining the bug report').setRequired(true)),
  new SlashCommandBuilder()
    .setName('bug-list')
    .setDescription('List all bugs with a specific status')
    .addStringOption(option => 
      option.setName('type')
        .setDescription('Type of bugs to list')
        .setRequired(true)
        .addChoices(
          { name: 'Accepted', value: 'accepted' },
          { name: 'Declined', value: 'declined' }
        )
    )
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await initDatabase();
    console.log('Database initialized.');
    
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed during initialization:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const command = commandModules[interaction.commandName];
  if (command) {
    await command.execute(interaction);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  
  try {
    const reportChannelId = await getBugReportChannel(message.guild.id);
    if (message.channel.id !== reportChannelId) return;
    
    const content = message.content;
    
    const modeMatch = content.match(/\[Mode\]\s+(.*?):/i);
    const bugMatch = content.match(/\[Bug\]\s+(.*?):/i);
    const descMatch = content.match(/\[Bug Description\]\s+(.*?):/i);
    const mediaMatch = content.match(/\[Media\]\s+(.*?):/i);
    
    if (!modeMatch || !bugMatch || !descMatch) {
      try {
        await message.delete();
      } catch (err) {
        console.error('Error deleting invalid bug report:', err);
      }
      
      const reminder = await message.channel.send({
        content: `<@${message.author.id}>`,
        embeds: [{
          title: '❌ Invalid Bug Report Format',
          description: 'Your bug report does not follow the required format. Please use the format below:',
          fields: [{
            name: 'Required Format',
            value: '```\n[Mode] Mode name:\n[Bug] Bug name:\n[Bug Description] Description:\n[Media] Any image or video link:\n```'
          }],
          color: 0xFF0000
        }]
      });
      
      setTimeout(() => {
        reminder.delete().catch(err => console.error('Error deleting reminder message:', err));
      }, 5000);
      
      return;
    }
    
    const extractValue = (match, content, nextFieldIndex) => {
      if (!match) return null;
      
      const startPos = content.indexOf(match[0]) + match[0].length;
      let endPos;
      
      const nextFields = [
        content.indexOf('[Bug]', startPos),
        content.indexOf('[Bug Description]', startPos),
        content.indexOf('[Media]', startPos)
      ].filter(pos => pos > startPos);
      
      if (nextFields.length > 0) {
        endPos = Math.min(...nextFields);
      } else {
        endPos = content.length;
      }
      
      return content.substring(startPos, endPos).trim();
    };
    
    const mode = extractValue(modeMatch, content);
    const bugName = extractValue(bugMatch, content);
    const description = extractValue(descMatch, content);
    const media = mediaMatch ? extractValue(mediaMatch, content) : null;
    
    await addBugReport(
      message.id,
      message.channel.id,
      message.author.id
    );
    
  } catch (error) {
    console.error('Error processing bug report:', error);
  }
});

client.login(TOKEN);
