import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import config from '../../config.js';

export default {
  name: 'send-welcome',
  data: new SlashCommandBuilder()
    .setName('send-welcome')
    .setDescription('Send the staff onboarding welcome message to a channel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to send the welcome message to')
        .setRequired(true)),
  async execute(interaction) {
    const guild = await interaction.client.guilds.fetch(config.STAFF_GUILD_ID).catch(() => null);
    if (!guild) {
      return interaction.reply({ 
        content: 'Staff server not found. Please contact an administrator.', 
        flags: 64 
      });
    }
    
    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      return interaction.reply({ 
        content: 'You must be a member of the staff server to use this command.', 
        flags: 64 
      });
    }
    
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ 
        content: 'Only administrators can use this command.', 
        flags: 64 
      });
    }
    
    const channel = interaction.options.getChannel('channel');
    
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('Welcome to Fusion Network')
      .setDescription('You have been invited to the Fusion Network staff server. Before you get access, there is one quick step to complete.')
      .addFields(
        { name: '📝 Getting set up', value: 'Run `/onboard` right here in this channel. I will DM you a short form (preferred name, Minecraft IGN, and timezone). It takes under a minute.', inline: false },
        { name: '🔒 Confidentiality', value: 'Everything shared inside this server is confidential, so please do not repeat it anywhere outside, including with former staff. Never share personal details and do not click suspicious links.', inline: false },
        { name: '✅ What happens next', value: 'Once you submit, management reviews your details and sets you up with the right role. Until then, this is the only channel you can see. Sit tight, it will not take long.', inline: false }
      )
      .setColor(0x3498DB)
      .setTimestamp();
    
    try {
      await channel.send({ embeds: [welcomeEmbed] });
      await interaction.reply({ 
        content: `✅ Welcome message sent to ${channel}`, 
        flags: 64 
      });
    } catch (error) {
      console.error('Error sending welcome message:', error);
      await interaction.reply({ 
        content: 'An error occurred while sending the welcome message. Make sure I have permission to send messages in that channel.', 
        flags: 64 
      });
    }
  }
};
