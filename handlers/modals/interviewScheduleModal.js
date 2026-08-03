import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { scheduleInterview } from '../../database/mainDb.js';
import { EmbedBuilder, ActionRowBuilder as ActionRowBuilderButtons, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../../config.js';

export async function showInterviewScheduleModal(interaction) {
  const channelId = interaction.customId.split('_').pop();
  
  const modal = new ModalBuilder()
    .setCustomId(`interview_schedule_${channelId}`)
    .setTitle('Schedule Interview');

  const dateInput = new TextInputBuilder()
    .setCustomId('interview_date')
    .setLabel('Date (YYYY-MM-DD)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('2024-08-15')
    .setRequired(true);

  const timeInput = new TextInputBuilder()
    .setCustomId('interview_time')
    .setLabel('Time (HH:MM in 24h format)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('14:30')
    .setRequired(true);

  const timezoneInput = new TextInputBuilder()
    .setCustomId('interview_timezone')
    .setLabel('Timezone (e.g., UTC, EST, PST)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('UTC')
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(dateInput);
  const secondActionRow = new ActionRowBuilder().addComponents(timeInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(timezoneInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  await interaction.showModal(modal);
}

export async function handleInterviewScheduleModal(interaction) {
  const channelId = interaction.customId.split('_').pop();
  
  const date = interaction.fields.getTextInputValue('interview_date');
  const time = interaction.fields.getTextInputValue('interview_time');
  const timezone = interaction.fields.getTextInputValue('interview_timezone');

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return interaction.reply({ 
      content: 'Invalid date format. Please use YYYY-MM-DD format.', 
      flags: 64 
    });
  }

  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(time)) {
    return interaction.reply({ 
      content: 'Invalid time format. Please use HH:MM format (24h).', 
      flags: 64 
    });
  }

  const scheduledDateTime = new Date(`${date}T${time}:00`);
  
  if (isNaN(scheduledDateTime.getTime())) {
    return interaction.reply({ 
      content: 'Invalid date or time. Please check your input.', 
      flags: 64 
    });
  }

  if (scheduledDateTime <= new Date()) {
    return interaction.reply({ 
      content: 'Interview must be scheduled for a future time.', 
      flags: 64 
    });
  }

  try {
    await interaction.deferReply({ flags: 64 });

    const application = await scheduleInterview(channelId, scheduledDateTime.toISOString(), interaction.user.id);
    
    if (!application || !application.staff_id) {
      return interaction.editReply({ content: 'Could not find application data.' });
    }

    const embed = new EmbedBuilder()
      .setTitle('📅 Interview Scheduled')
      .setColor(0x5865F2)
      .setDescription(`Your staff application interview has been scheduled.`)
      .addFields(
        { name: 'Date', value: date, inline: true },
        { name: 'Time', value: `${time} ${timezone}`, inline: true },
        { name: 'Scheduled For', value: `<t:${Math.floor(scheduledDateTime.getTime() / 1000)}:R>`, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: `Scheduled by ${interaction.user.tag}` });

    const row = new ActionRowBuilderButtons()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`interview_accept_${channelId}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`interview_decline_${channelId}`)
          .setLabel('Decline')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`interview_reschedule_${channelId}`)
          .setLabel('Reschedule')
          .setStyle(ButtonStyle.Secondary)
      );

    const message = await interaction.channel.send({
      content: `<@${application.staff_id}>`,
      embeds: [embed],
      components: [row]
    });

    await import('../../database/mainDb.js').then(db => db.setInterviewMessage(channelId, message.id));

    await interaction.editReply({ 
      content: `✅ Interview scheduled for ${date} at ${time} ${timezone}. A voice channel will be created 10 minutes before the interview time.` 
    });

    try {
      const user = await interaction.client.users.fetch(application.staff_id);
      await user.send({
        content: `📅 Your staff application interview has been scheduled for ${date} at ${time} ${timezone}. Please check the application channel for more details and to confirm your attendance.`
      });
    } catch (dmError) {
      console.error('Error sending DM to user:', dmError);
    }

  } catch (error) {
    console.error('Error handling interview schedule modal:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: 'An error occurred while scheduling the interview. Please try again.', 
        flags: 64 
      });
    } else if (interaction.deferred) {
      await interaction.editReply({ 
        content: 'An error occurred while scheduling the interview. Please try again.' 
      });
    }
  }
}