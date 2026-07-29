import { getLOARequestById, getLOASettings } from '../../database/mainDb.js';
import { error, success } from '../../utils/logger.js';

export async function handleLOAExplanationModal(interaction) {
  if (!interaction.isModalSubmit() || !interaction.customId.startsWith('loa_explanation_')) return;

  const [, , loaId] = interaction.customId.split('_');
  if (!loaId) return;

  await interaction.deferReply({ ephemeral: true });

  try {
    const loaRequest = await getLOARequestById(parseInt(loaId));
    if (!loaRequest) {
      return interaction.editReply({
        content: 'LOA request not found.'
      });
    }

    if (loaRequest.user_id !== interaction.user.id) {
      return interaction.editReply({
        content: 'This is not your LOA request.'
      });
    }

    const explanation = interaction.fields.getTextInputValue('explanation');

    const loaSettings = await getLOASettings(loaRequest.guild_id);
    
    if (loaSettings && loaSettings.manager_role_ids) {
      try {
        const guild = await interaction.client.guilds.fetch(loaRequest.guild_id);
        
        let managerRoleIds;
        try {
          managerRoleIds = JSON.parse(loaSettings.manager_role_ids);
        } catch {
          managerRoleIds = [loaSettings.manager_role_ids];
        }
        
        if (!Array.isArray(managerRoleIds)) {
          managerRoleIds = [managerRoleIds];
        }
        
        let targetChannel;
        if (loaSettings.loa_channel_id) {
          targetChannel = await guild.channels.fetch(loaSettings.loa_channel_id).catch(() => null);
        }
        
        if (targetChannel && managerRoleIds.length > 0) {
          const roleMentions = managerRoleIds.filter(id => id).map(id => `<@&${id}>`).join(' ');
          await targetChannel.send({
            content: roleMentions,
            embeds: [{
              title: '🚨 Emergency LOA Explanation',
              description: `User <@${loaRequest.user_id}> has provided an explanation for their denied LOA request.`,
              fields: [
                { name: 'User', value: `<@${loaRequest.user_id}>`, inline: true },
                { name: 'Requested Dates', value: `${loaRequest.start_date} to ${loaRequest.end_date}`, inline: true },
                { name: 'Days Requested', value: loaRequest.days_requested.toString(), inline: true },
                { name: 'Original Reason', value: loaRequest.reason },
                { name: 'Emergency Explanation', value: explanation }
              ],
              color: 0xFFA500,
              footer: { text: `LOA Request ID: ${loaId}` }
            }]
          });
        }
      } catch (err) {
        error('Error sending explanation to manager', err);
      }
    }

    success(`LOA explanation sent for request ${loaId} by user ${interaction.user.tag}`);
    return interaction.editReply({
      content: 'Your explanation has been sent to the Staff Manager for review. They will contact you if they approve your emergency LOA request.'
    });
  } catch (err) {
    error('Error handling LOA explanation modal', err);
    return interaction.editReply({
      content: 'An error occurred while submitting your explanation.'
    });
  }
}
