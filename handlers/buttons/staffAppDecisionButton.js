import { updateStaffApplicationStatus, getStaffApplicationByChannel } from '../../database/mainDb.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import roles from '../../config/roles.json' with { type: 'json' };

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
      
      await interaction.editReply({ content: 'This staff application channel will be closed in 5 seconds.' });
      
      setTimeout(async () => {
        await interaction.channel.delete('Staff application closed by manager');
      }, 5000);
    }
  } catch (error) {
    console.error('Error handling staff application decision:', error);
    await interaction.editReply({ content: 'An error occurred while processing your decision.' });
  }
}
