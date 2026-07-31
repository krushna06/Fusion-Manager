import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { getAllStaffApplications } from '../../database/mainDb.js';
import { deleteStaffApplication } from '../../database/models/staffApplication.js';
import config from '../../config.js';

export default {
  name: 'staff-list',
  data: new SlashCommandBuilder()
    .setName('staff-list')
    .setDescription('List all open staff applications'),
  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: 64 });
      
      let hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
      
      if (!hasPermission && config.roles.mainServer.staffManagerRole && config.channels.mainServer.guildId) {
        try {
          const mainGuild = await interaction.client.guilds.fetch(config.channels.mainServer.guildId).catch(() => null);
          if (mainGuild) {
            const mainMember = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
            if (mainMember && mainMember.roles.cache.has(config.roles.mainServer.staffManagerRole)) {
              hasPermission = true;
            }
          }
        } catch (err) {
          console.error('Error checking staff manager role in main server:', err);
        }
      }
      
      if (!hasPermission) {
        return interaction.editReply({ content: 'You do not have permission to use this command.' });
      }

      const applications = await getAllStaffApplications();
      
      if (!applications || applications.length === 0) {
        return interaction.editReply({ content: 'There are no open staff applications.' });
      }

      const validApplications = [];
      const invalidApplications = [];
      
      for (const app of applications) {
        try {
          const channel = await interaction.client.channels.fetch(app.channel_id).catch(() => null);
          if (channel) {
            validApplications.push(app);
          } else {
            invalidApplications.push(app);
            await deleteStaffApplication(app.channel_id);
          }
        } catch (error) {
          invalidApplications.push(app);
          await deleteStaffApplication(app.channel_id);
        }
      }

      if (validApplications.length === 0) {
        return interaction.editReply({ 
          content: 'There are no open staff applications.' 
        });
      }

      const maxFields = 25;
      const displayApps = validApplications.slice(0, maxFields);
      const remainingApps = validApplications.length - maxFields;

      const embed = new EmbedBuilder()
        .setTitle('Open Staff Applications')
        .setColor(0x5865F2)
        .setDescription(`Found ${validApplications.length} open staff application(s)${remainingApps > 0 ? ` (showing first ${maxFields})` : ''}`)
        .addFields(
          displayApps.map(app => ({
            name: `Application #${app.id}`,
            value: `**User:** <@${app.staff_id}>\n**Channel:** <#${app.channel_id}>\n**Status:** ${app.status}\n**Created:** ${new Date(app.created_at).toLocaleDateString()}`,
            inline: false
          }))
        )
        .setTimestamp();

      if (remainingApps > 0) {
        embed.setFooter({ text: `${remainingApps} more applications not shown. Contact a developer to see all applications.` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error in /staff-list:', err);
      if (interaction.deferred || interaction.replied) {
        try {
          await interaction.editReply({ content: 'An error occurred while fetching staff applications.' });
        } catch (editError) {
          console.error('Error editing error reply:', editError);
        }
      } else {
        try {
          await interaction.reply({ content: 'An error occurred while fetching staff applications.', flags: 64 });
        } catch (replyError) {
          console.error('Error sending error reply:', replyError);
        }
      }
    }
  }
};
