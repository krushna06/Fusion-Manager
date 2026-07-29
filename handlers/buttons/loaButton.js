import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField } from 'discord.js';
import { getLOARequestById, getLOASettings, updateLOAStatus } from '../../database/mainDb.js';
import { error, success } from '../../utils/logger.js';

export async function handleLOAButton(interaction) {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('loa_explain_')) {
    const [, , loaId] = interaction.customId.split('_');
    if (!loaId) return;

    try {
      const loaRequest = await getLOARequestById(parseInt(loaId));
      if (!loaRequest) {
        return interaction.reply({
          content: 'LOA request not found.',
          ephemeral: true
        });
      }

      if (loaRequest.user_id !== interaction.user.id) {
        return interaction.reply({
          content: 'This is not your LOA request.',
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`loa_explanation_${loaId}`)
        .setTitle('Explain Your Emergency LOA')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('explanation')
              .setLabel('Please explain why this is a genuine emergency')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(1000)
          )
        );

      await interaction.showModal(modal);
    } catch (err) {
      error('Error handling LOA explanation button', err);
      return interaction.reply({
        content: 'An error occurred while opening the explanation form.',
        ephemeral: true
      });
    }
  }

  if (interaction.customId.startsWith('loa_approve_')) {
    const [, , loaId] = interaction.customId.split('_');
    if (!loaId) return;

    await interaction.deferReply({ ephemeral: true });

    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
          !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.editReply({
          content: 'You do not have permission to approve LOA requests.'
        });
      }

      const loaRequest = await getLOARequestById(parseInt(loaId));
      if (!loaRequest) {
        return interaction.editReply({
          content: 'LOA request not found.'
        });
      }

      await updateLOAStatus(parseInt(loaId), 'approved');

      try {
        const guild = await interaction.client.guilds.fetch(loaRequest.guild_id);
        const member = await guild.members.fetch(loaRequest.user_id).catch(() => null);
        if (member) {
          const currentNickname = member.nickname || member.user.username;
          await member.setNickname(`[LOA] ${currentNickname}`);
        }
      } catch (nickErr) {
        error('Failed to set nickname', nickErr);
      }

      try {
        const user = await interaction.client.users.fetch(loaRequest.user_id);
        await user.send({
          embeds: [{
            title: '✅ LOA Request Approved',
            description: `Your Leave of Absence request has been approved by management.`,
            fields: [
              { name: 'Start Date', value: loaRequest.start_date, inline: true },
              { name: 'End Date', value: loaRequest.end_date, inline: true },
              { name: 'Days', value: loaRequest.days_requested.toString(), inline: true }
            ],
            color: 0x57F287
          }]
        });
      } catch (dmErr) {
        error('Failed to send DM to user', dmErr);
      }

      const embed = interaction.message.embeds[0];
      embed.data.title = '✅ Manual LOA Request Approved';
      embed.data.color = 0x57F287;
      embed.data.fields.push({ name: 'Approved By', value: `<@${interaction.user.id}>`, inline: true });

      await interaction.message.edit({ 
        embeds: [embed], 
        components: [] 
      });

      await interaction.editReply({
        content: 'LOA request approved successfully.',
        flags: 64
      });

      success(`LOA request ${loaId} approved by ${interaction.user.tag}`);
    } catch (err) {
      error('Error handling LOA approve button', err);
      return interaction.editReply({
        content: 'An error occurred while approving the LOA request.'
      });
    }
  }

  if (interaction.customId.startsWith('loa_deny_')) {
    const [, , loaId] = interaction.customId.split('_');
    if (!loaId) return;

    await interaction.deferReply({ ephemeral: true });

    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
          !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.editReply({
          content: 'You do not have permission to deny LOA requests.'
        });
      }

      const loaRequest = await getLOARequestById(parseInt(loaId));
      if (!loaRequest) {
        return interaction.editReply({
          content: 'LOA request not found.'
        });
      }

      await updateLOAStatus(parseInt(loaId), 'denied');

      try {
        const user = await interaction.client.users.fetch(loaRequest.user_id);
        await user.send({
          embeds: [{
            title: '❌ LOA Request Denied',
            description: `Your Leave of Absence request has been denied by management.`,
            fields: [
              { name: 'Start Date', value: loaRequest.start_date, inline: true },
              { name: 'End Date', value: loaRequest.end_date, inline: true },
              { name: 'Days Requested', value: loaRequest.days_requested.toString(), inline: true }
            ],
            color: 0xED4245
          }]
        });
      } catch (dmErr) {
        error('Failed to send DM to user', dmErr);
      }

      const embed = interaction.message.embeds[0];
      embed.data.title = '❌ Manual LOA Request Denied';
      embed.data.color = 0xED4245;
      embed.data.fields.push({ name: 'Denied By', value: `<@${interaction.user.id}>`, inline: true });

      await interaction.message.edit({ 
        embeds: [embed], 
        components: [] 
      });

      await interaction.editReply({
        content: 'LOA request denied successfully.',
        flags: 64
      });

      success(`LOA request ${loaId} denied by ${interaction.user.tag}`);
    } catch (err) {
      error('Error handling LOA deny button', err);
      return interaction.editReply({
        content: 'An error occurred while denying the LOA request.'
      });
    }
  }
}
