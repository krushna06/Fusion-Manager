import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createLOARequest, getUserLOABalance, getLOASettings, updateLOAStatus, hasAutoApprovedLOAThisMonth, getTotalLOAsByUser } from '../../database/mainDb.js';
import { success, error } from '../../utils/logger.js';

export default {
  name: 'loa',
  data: new SlashCommandBuilder()
    .setName('loa')
    .setDescription('Request a Leave of Absence from staff duties')
    .addStringOption(option =>
      option.setName('start_date')
        .setDescription('Start date of your LOA (YYYY-MM-DD format)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('end_date')
        .setDescription('End date of your LOA (YYYY-MM-DD format)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for your LOA request')
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const startDate = interaction.options.getString('start_date');
    const endDate = interaction.options.getString('end_date');
    const reason = interaction.options.getString('reason');

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return interaction.editReply({
        content: 'Invalid date format. Please use YYYY-MM-DD format (e.g., 2026-07-20).'
      });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return interaction.editReply({
        content: 'Invalid dates. Please provide valid dates.'
      });
    }

    if (end <= start) {
      return interaction.editReply({
        content: 'End date must be after start date.'
      });
    }

    const diffTime = Math.abs(end - start);
    const daysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (daysRequested > 7) {
      return interaction.editReply({
        content: 'Requests for more than 7 days in a month are treated as resignations. Please contact management directly.'
      });
    }

    const loaSettings = await getLOASettings(interaction.guild.id);
    if (!loaSettings) {
      return interaction.editReply({
        content: 'LOA system has not been set up in this server yet. Please ask an administrator to run /setup-loa.'
      });
    }

    const hasAutoApprovedThisMonth = await hasAutoApprovedLOAThisMonth(interaction.user.id, interaction.guild.id);
    
    const remainingBalance = await getUserLOABalance(interaction.user.id, interaction.guild.id);
    
    const totalLOAs = await getTotalLOAsByUser(interaction.user.id, interaction.guild.id);

    const requiresManualApproval = hasAutoApprovedThisMonth || daysRequested > remainingBalance;

    try {
      const loaId = await createLOARequest(
        interaction.user.id,
        interaction.guild.id,
        startDate,
        endDate,
        reason,
        daysRequested,
        requiresManualApproval ? 0 : 1
      );

      if (loaSettings.loa_log_channel_id) {
        try {
          const logChannel = await interaction.guild.channels.fetch(loaSettings.loa_log_channel_id).catch(() => null);
          if (logChannel) {
            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`loa_approve_${loaId}`)
                  .setLabel('Approve')
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId(`loa_deny_${loaId}`)
                  .setLabel('Deny')
                  .setStyle(ButtonStyle.Danger)
              );

            await logChannel.send({
              embeds: [{
                title: requiresManualApproval ? '📋 Manual LOA Request' : '✅ Auto-Approved LOA Request',
                description: `User <@${interaction.user.id}> has requested a Leave of Absence.`,
                fields: [
                  { name: 'User', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                  { name: 'Start Date', value: startDate, inline: true },
                  { name: 'End Date', value: endDate, inline: true },
                  { name: 'Days Requested', value: daysRequested.toString(), inline: true },
                  { name: 'Reason', value: reason },
                  { name: 'Type', value: requiresManualApproval ? 'Manual Review Required' : 'Auto-Approved', inline: true },
                  { name: 'Total LOAs Used', value: totalLOAs.toString(), inline: true }
                ],
                color: requiresManualApproval ? 0xFFA500 : 0x57F287,
                footer: { text: `LOA Request ID: ${loaId}` }
              }],
              components: requiresManualApproval ? [row] : []
            });
          }
        } catch (logErr) {
          error('Failed to send to log channel', logErr);
        }
      }

      if (requiresManualApproval) {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const daysUntilNext = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));

        let denialReason;
        if (hasAutoApprovedThisMonth) {
          denialReason = `You have already used your auto-approved LOA for this month. Your next auto-approved request will be available on ${nextMonth.toISOString().split('T')[0]} (${daysUntilNext} days).`;
        } else {
          denialReason = `You only have ${remainingBalance} days remaining this month, but you requested ${daysRequested} days.`;
        }

        try {
          await interaction.user.send({
            embeds: [{
              title: '📋 LOA Request Requires Manual Review',
              description: `Your Leave of Absence request has been sent to management for manual review.`,
              fields: [
                { name: 'Start Date', value: startDate, inline: true },
                { name: 'End Date', value: endDate, inline: true },
                { name: 'Days Requested', value: daysRequested.toString(), inline: true },
                { name: 'Reason', value: reason },
                { name: 'Status', value: denialReason },
                { name: 'Total LOAs Used', value: totalLOAs.toString(), inline: true }
              ],
              color: 0xFFA500
            }]
          });
        } catch (dmErr) {
          error('Failed to send DM', dmErr);
        }

        success(`LOA request ${loaId} sent for manual review for user ${interaction.user.tag}`);
        return interaction.editReply({
          content: `Your LOA request has been sent to management for manual review. ${denialReason}`
        });
      } else {
        await updateLOAStatus(loaId, 'approved');

        try {
          const member = await interaction.guild.members.fetch(interaction.user.id);
          const currentNickname = member.nickname || interaction.user.username;
          await member.setNickname(`[LOA] ${currentNickname}`);
        } catch (nickErr) {
          error('Failed to set nickname', nickErr);
        }

        try {
          await interaction.user.send({
            embeds: [{
              title: '✅ LOA Request Approved',
              description: `Your Leave of Absence has been automatically approved.`,
              fields: [
                { name: 'Start Date', value: startDate, inline: true },
                { name: 'End Date', value: endDate, inline: true },
                { name: 'Days', value: daysRequested.toString(), inline: true },
                { name: 'Reason', value: reason },
                { name: 'Total LOAs Used', value: totalLOAs.toString(), inline: true }
              ],
              color: 0x57F287,
              footer: { text: `Remaining balance this month: ${remainingBalance - daysRequested} days` }
            }]
          });
        } catch (dmErr) {
          error('Failed to send DM', dmErr);
        }

        success(`LOA request ${loaId} auto-approved for user ${interaction.user.tag}`);
        return interaction.editReply({
          content: `Your LOA request has been automatically approved! Check your DMs for confirmation. Your nickname has been updated to [LOA].`
        });
      }
    } catch (err) {
      error('Error processing LOA request', err);
      return interaction.editReply({
        content: `Failed to process your LOA request: ${err.message}`
      });
    }
  }
};
