import { PermissionsBitField, ChannelType } from 'discord.js';
import { setBugReportChannel } from '../database.js';
import config from '../config.js';

export default {
  name: 'bug-report',
  async execute(interaction) {
    const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) || 
                          (config.MANAGER_ROLE && interaction.member.roles.cache.has(config.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to set up the bug reporting system.', 
        ephemeral: true 
      });
    }
    
    try {
      const channel = await interaction.guild.channels.create({
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
      
      return interaction.reply({
        content: `Bug reporting channel has been set up: ${channel}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error setting up bug report channel:', error);
      return interaction.reply({
        content: `Failed to set up bug reporting system: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
