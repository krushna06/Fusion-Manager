import { PermissionsBitField } from 'discord.js';
import { getBugReportsByStatus, getBugReportChannel } from '../database.js';
import config from '../config.js';

export default {
  name: 'bug-list',
  async execute(interaction) {
    const hasPermission = (config.MANAGER_ROLE && interaction.member.roles.cache.has(config.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to list bug reports.', 
        ephemeral: true 
      });
    }
    
    const type = interaction.options.getString('type');
    
    if (type !== 'accepted' && type !== 'declined') {
      return interaction.reply({
        content: 'Invalid type. Please specify either "accepted" or "declined".',
        ephemeral: true
      });
    }
    
    try {
      const reportChannelId = await getBugReportChannel(interaction.guild.id);
      
      if (!reportChannelId) {
        return interaction.reply({
          content: 'Bug reporting system is not set up. Please run /bug-report first.',
          ephemeral: true
        });
      }
      
      const bugReports = await getBugReportsByStatus(type);
      
      if (bugReports.length === 0) {
        return interaction.reply({
          content: `No ${type} bug reports found.`,
          ephemeral: true
        });
      }
      
      const guildId = interaction.guild.id;
      const messageLinks = bugReports.map(report => {
        return `- https://discord.com/channels/${guildId}/${report.channel_id}/${report.message_id}`;
      });
      
      await interaction.reply({
        embeds: [{
          title: `List of ${type} bugs`,
          description: messageLinks.join('\n'),
          color: type === 'accepted' ? 0x00FF00 : 0xFF0000,
          footer: {
            text: `Total: ${bugReports.length} ${type} bug reports`
          },
          timestamp: new Date()
        }]
      });
    } catch (error) {
      console.error(`Error listing ${type} bug reports:`, error);
      return interaction.reply({
        content: `Failed to list ${type} bug reports: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
