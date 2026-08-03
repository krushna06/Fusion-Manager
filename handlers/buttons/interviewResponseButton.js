import { updateInterviewStatus, getStaffApplicationByChannel } from '../../database/mainDb.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import { showInterviewScheduleModal } from '../modals/interviewScheduleModal.js';
import config from '../../config.js';

export async function handleInterviewResponseButton(interaction) {
  const channelId = interaction.customId.split('_').pop();
  const action = interaction.customId.startsWith('interview_accept_') ? 'accept' : 
                interaction.customId.startsWith('interview_decline_') ? 'decline' : 'reschedule';

  const application = await getStaffApplicationByChannel(channelId);
  if (!application) {
    return interaction.reply({ 
      content: 'Application not found.', 
      flags: 64 
    });
  }

  if (application.staff_id !== interaction.user.id) {
    return interaction.reply({ 
      content: 'Only the applicant can respond to interview scheduling.', 
      flags: 64 
    });
  }

  if (action === 'accept') {
    await updateInterviewStatus(channelId, 'accepted');
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Interview Accepted')
      .setColor(0x57F287)
      .setDescription(`<@${interaction.user.id}> has accepted the interview scheduled for <t:${Math.floor(new Date(application.interview_scheduled_time).getTime() / 1000)}:R>.`)
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: []
    });

    try {
      const managerRoles = Array.isArray(config.roles.mainServer.staffManagerRole) 
        ? config.roles.mainServer.staffManagerRole 
        : [config.roles.mainServer.staffManagerRole];

      const content = managerRoles.map(roleId => `<@&${roleId}>`).join(' ');
      await interaction.channel.send({
        content: `${content} Interview accepted by applicant. Voice channel will be created 10 minutes before the scheduled time.`
      });
    } catch (error) {
      console.error('Error notifying staff managers:', error);
    }

  } else if (action === 'decline') {
    await updateInterviewStatus(channelId, 'declined');
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Interview Declined')
      .setColor(0xED4245)
      .setDescription(`<@${interaction.user.id}> has declined the interview scheduled for <t:${Math.floor(new Date(application.interview_scheduled_time).getTime() / 1000)}:R>.`)
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`schedule_interview_${channelId}`)
          .setLabel('Reschedule Interview')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.update({
      embeds: [embed],
      components: [row]
    });

    try {
      const managerRoles = Array.isArray(config.roles.mainServer.staffManagerRole) 
        ? config.roles.mainServer.staffManagerRole 
        : [config.roles.mainServer.staffManagerRole];

      const content = managerRoles.map(roleId => `<@&${roleId}>`).join(' ');
      await interaction.channel.send({
        content: `${content} Interview declined by applicant. Please reschedule.`
      });
    } catch (error) {
      console.error('Error notifying staff managers:', error);
    }

  } else if (action === 'reschedule') {
    await updateInterviewStatus(channelId, 'reschedule_requested');
    
    const embed = new EmbedBuilder()
      .setTitle('🔄 Reschedule Requested')
      .setColor(0xFEE75C)
      .setDescription(`<@${interaction.user.id}> has requested to reschedule the interview.`)
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: []
    });

    try {
      const managerRoles = Array.isArray(config.roles.mainServer.staffManagerRole) 
        ? config.roles.mainServer.staffManagerRole 
        : [config.roles.mainServer.staffManagerRole];

      const content = managerRoles.map(roleId => `<@&${roleId}>`).join(' ');
      await interaction.channel.send({
        content: `${content} Applicant has requested to reschedule. Please use the button below to select a new time.`,
        components: [
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`schedule_interview_${channelId}`)
                .setLabel('Schedule New Time')
                .setStyle(ButtonStyle.Primary)
            )
        ]
      });
    } catch (error) {
      console.error('Error notifying staff managers:', error);
    }
  }
}