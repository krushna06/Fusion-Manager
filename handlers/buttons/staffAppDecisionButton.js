import { updateStaffApplicationStatus, getStaffApplicationByChannel } from '../../database/mainDb.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { generateFromMessages } from 'discord-html-transcripts';
import roles from '../../config/roles.json' with { type: 'json' };
import config from '../../config/config.json' with { type: 'json' };

export async function handleStaffAppDecisionButton(interaction) {
  if (!interaction.member.roles.cache.has(roles.STAFF_APPLICATION_MANAGER_ROLE)) {
    return interaction.reply({ 
      content: 'You do not have permission to use this button.', 
      flags: 64 
    });
  }

  const action = interaction.customId.startsWith('staff_accept_') ? 'accept' : 
                interaction.customId.startsWith('staff_reject_') ? 'reject' : 'close';
  const channelId = interaction.customId.split('_').pop();

  await interaction.deferReply();

  try {
    if (action === 'accept') {
      await updateStaffApplicationStatus(channelId, 'accepted');
      
      const application = await getStaffApplicationByChannel(channelId);
      if (application && application.staff_id) {
        const member = await interaction.guild.members.fetch(application.staff_id).catch(() => null);
        if (member && roles.TRIAL_STAFF_ROLE) {
          await member.roles.add(roles.TRIAL_STAFF_ROLE).catch(console.error);
        }
      }
      
      await interaction.editReply({ content: 'Application accepted! The user has been notified and given the trial staff role.' });
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`staff_close_${channelId}`)
            .setLabel('Close Application')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.channel.send({
        content: `🎉 **Congratulations!** Your staff application has been **accepted**! A staff member will reach out to you shortly with next steps.`,
        components: [row]
      });

      await interaction.message.edit({
        components: []
      });
    } else if (action === 'reject') {
      await updateStaffApplicationStatus(channelId, 'rejected');
      
      await interaction.editReply({ content: 'Application rejected. The user will be notified.' });
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`staff_close_${channelId}`)
            .setLabel('Close Application')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.channel.send({
        content: `❌ **Application Rejected**. Unfortunately, your staff application has been declined at this time. You may apply again in 30 days. Thank you for your interest!`,
        components: [row]
      });

      await interaction.message.edit({
        components: []
      });
    } else if (action === 'close') {
      await updateStaffApplicationStatus(channelId, 'closed');
      
      await interaction.editReply({ content: 'Generating transcript and closing application...' });
      
      const application = await getStaffApplicationByChannel(channelId);
      
      const messages = await interaction.channel.messages.fetch();
      const transcriptBuffer = await generateFromMessages(messages, interaction.channel, {
        returnType: 'buffer',
        filename: `staff-app-${application?.minecraft_username || 'unknown'}.html`
      });
      
      const transcriptAttachment = new AttachmentBuilder(transcriptBuffer, {
        name: `staff-app-${application?.minecraft_username || 'unknown'}.html`
      });
      
      const createdAt = application?.created_at ? new Date(application.created_at) : new Date();
      const closedAt = new Date();
      const daysDiff = Math.floor((closedAt - createdAt) / (1000 * 60 * 60 * 24));
      
      const formatDate = (date) => date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      let closeReason = 'Closed';
      if (application?.status === 'accepted') {
        closeReason = 'Accepted';
      } else if (application?.status === 'rejected') {
        closeReason = 'Denied';
      }
      
      const embed = new EmbedBuilder()
        .setTitle('Application Closed')
        .setColor(0x5865F2)
        .addFields(
          { name: 'Topic', value: application?.minecraft_username || 'Unknown', inline: true },
          { name: 'Created at', value: formatDate(createdAt), inline: true },
          { name: 'Closed at', value: formatDate(closedAt), inline: true },
          { name: '\u200b', value: `(after ${daysDiff} days)`, inline: true },
          { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Closed because', value: closeReason, inline: true }
        );
      
      if (config.STAFF_APPLICATION_LOGS_CHANNEL_ID) {
        const logsChannel = await interaction.guild.channels.fetch(config.STAFF_APPLICATION_LOGS_CHANNEL_ID).catch(() => null);
        if (logsChannel) {
          await logsChannel.send({
            embeds: [embed],
            files: [transcriptAttachment]
          });
        }
      }
      
      await interaction.editReply({ content: 'Staff application closed and logged.' });
      
      setTimeout(async () => {
        await interaction.channel.delete('Staff application closed by manager');
      }, 2000);
    }
  } catch (error) {
    console.error('Error handling staff application decision:', error);
    await interaction.editReply({ content: 'An error occurred while processing your decision.' });
  }
}
