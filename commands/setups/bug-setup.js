import { PermissionsBitField, ChannelType, SlashCommandBuilder } from 'discord.js';
import { setBugReportChannel } from '../../database/models/guild.js';
import config from '../../config.js';
import { success, error } from '../../utils/logger.js';

export default {
  name: 'bug-setup',
  data: new SlashCommandBuilder()
    .setName('bug-setup')
    .setDescription('Setup a bug reporting channel for users')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Existing channel to use for bug reports (optional)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction) {
    let hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                        interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
    
    if (!hasPermission && config.roles.mainServer.managerRole && config.channels.mainServer.guildId) {
      try {
        const mainGuild = await interaction.client.guilds.fetch(config.channels.mainServer.guildId).catch(() => null);
        if (mainGuild) {
          const mainMember = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
          if (mainMember && mainMember.roles.cache.has(config.roles.mainServer.managerRole)) {
            hasPermission = true;
          }
        }
      } catch (err) {
        console.error('Error checking manager role in main server:', err);
      }
    }
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to set up the bug reporting system.', 
        ephemeral: true 
      });
    }
    
    try {
      let channel = interaction.options.getChannel('channel');
      
      if (!channel) {
        channel = await interaction.guild.channels.create({
          name: 'bug-reports',
          type: ChannelType.GuildText,
          topic: 'Report bugs in this channel using the specified format',
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            }
          ]
        });
        success(`New bug report channel created in guild ${interaction.guild.name}`);
      }
      
      await setBugReportChannel(interaction.guild.id, channel.id);
      
      await channel.send({
        embeds: [{
          title: '🐛 Bug Report System',
          description: 'Use this channel to report bugs in the following format:',
          fields: [
            {
              name: 'Format',
              value: '```\n[Mode] Mode name:\n[Bug] Bug name:\n[Bug Description] Description:\n[Media] Any image or video link:\n```'
            },
            {
              name: 'Notes',
              value: '- [Mode], [Bug], and [Bug Description] fields are required\n- [Media] field is optional\n- Reports not following this format will be marked as invalid'
            }
          ],
          color: 0xFF0000
        }]
      });
      
      success(`Bug report channel set to ${channel.name} in guild ${interaction.guild.name}`);
      return interaction.reply({
        content: `Bug report channel has been set up: ${channel}`,
        ephemeral: true
      });
    } catch (err) {
      error('Error setting up bug report channel', err);
      return interaction.reply({
        content: `Failed to set up bug report system: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
