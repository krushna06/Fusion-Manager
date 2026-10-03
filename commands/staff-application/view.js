import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import {
  getStaffApplicationByChannel,
  getStaffApplicationsByUser
} from '../../database/mainDb.js';
import { getSharedLinkerDb } from '../../database/linkerDb.js';
import {
  buildStaffApplicationEmbeds,
  groupEmbedsIntoMessages
} from '../../utils/staffApplicationEmbeds.js';
import { staffApplicationQuestions } from '../../utils/staffApplicationQuestions.js';
import { hasStaffApplicationReviewPermission } from '../../utils/staffPermissions.js';

function parseUserId(input) {
  if (!input) return null;
  const match = String(input).match(/(\d{17,20})/);
  return match ? match[1] : null;
}

function parseChannelId(input) {
  if (!input) return null;
  const match = String(input).match(/(\d{17,20})/);
  return match ? match[1] : null;
}

function parseResponses(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error parsing staff application responses:', error);
    return {};
  }
}

function answeredCount(responses) {
  return staffApplicationQuestions.filter((question) => {
    const value = question.id === 'ign'
      ? (responses.ign || responses.minecraft_username)
      : responses[question.id];
    return value && String(value).trim().length > 0;
  }).length;
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

async function resolveApplication(interaction, userIdInput, channelIdInput) {
  const channelId = parseChannelId(channelIdInput);

  if (channelId) {
    const application = await getStaffApplicationByChannel(channelId);
    return { application, others: [] };
  }

  const userId = parseUserId(userIdInput);

  if (!userId) {
    if (interaction.channel && interaction.channel.name?.startsWith('staff-app-')) {
      const application = await getStaffApplicationByChannel(interaction.channel.id);
      return { application, others: [] };
    }
    return { application: null, others: [], needsTarget: true };
  }

  const applications = await getStaffApplicationsByUser(userId);
  if (applications.length === 0) {
    return { application: null, others: [], unknownUserId: userId };
  }

  return { application: applications[0], others: applications.slice(1) };
}

async function buildMetaEmbed(application, responses, user, others) {
  const linkedUsername = await (async () => {
    try {
      const link = await getSharedLinkerDb().getLinkByDiscord(application.staff_id);
      return link ? link.username : null;
    } catch (error) {
      console.error('Error fetching linked username for staff application view:', error);
      return null;
    }
  })();

  const embed = new EmbedBuilder()
    .setTitle('Staff Application Record')
    .setColor(0x5865F2)
    .setThumbnail(user?.displayAvatarURL({ size: 256 }) || null)
    .addFields(
      {
        name: 'Applicant',
        value: `${user ? `<@${user.id}>` : `<@${application.staff_id}>`}${user?.username ? ` (${user.username})` : ''}\n\`${application.staff_id}\``,
        inline: false
      },
      { name: 'Application ID', value: `#${application.id}`, inline: true },
      { name: 'Status', value: `${application.status || 'pending'}`, inline: true },
      { name: 'Progress', value: `${application.application_state || 'unknown'} (step ${application.current_question_step ?? 0}/${staffApplicationQuestions.length})`, inline: true },
      { name: 'Answered', value: `${answeredCount(responses)}/${staffApplicationQuestions.length}`, inline: true },
      { name: 'Minecraft IGN', value: responses.ign || responses.minecraft_username || application.minecraft_username || linkedUsername || 'Not provided', inline: true },
      { name: 'Created', value: formatDate(application.created_at), inline: true },
      {
        name: 'Channel',
        value: application.channel_id
          ? (application.application_state === 'submitted' || application.status === 'closed'
              ? `\`${application.channel_id}\` (may be deleted)`
              : `<#${application.channel_id}>`)
          : 'None',
        inline: true
      }
    );

  if (application.rejected_at) {
    embed.addFields({ name: 'Rejected At', value: formatDate(application.rejected_at), inline: true });
  }

  if (application.interview_scheduled_time) {
    embed.addFields({
      name: 'Interview',
      value: `${formatDate(application.interview_scheduled_time)} - ${application.interview_status || 'pending'}`,
      inline: true
    });
  }

  if (others.length > 0) {
    embed.addFields({
      name: 'Other Applications',
      value: others
        .map(other => `#${other.id} - ${other.status || 'pending'} - ${formatDate(other.created_at)}`)
        .slice(0, 10)
        .join('\n'),
      inline: false
    });
  }

  if (answeredCount(responses) === 0) {
    embed.setFooter({ text: 'No answers have been recorded for this application yet.' });
  }

  return embed;
}

export default {
  name: 'staffapp-view',
  data: new SlashCommandBuilder()
    .setName('staffapp-view')
    .setDescription('View the stored answers of a staff application by Discord user ID')
    .addStringOption(option =>
      option.setName('user_id')
        .setDescription('Discord user ID or mention of the applicant')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('channel_id')
        .setDescription('Staff application channel ID to look up instead')
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      if (!await hasStaffApplicationReviewPermission(interaction)) {
        return interaction.editReply({ content: 'You do not have permission to use this command.' });
      }

      const userIdInput = interaction.options.getString('user_id');
      const channelIdInput = interaction.options.getString('channel_id');

      const { application, others, needsTarget, unknownUserId } =
        await resolveApplication(interaction, userIdInput, channelIdInput);

      if (needsTarget) {
        return interaction.editReply({
          content: 'Provide a Discord user ID with `user_id`, a channel ID with `channel_id`, or run this command inside the staff application channel.'
        });
      }

      if (!application) {
        return interaction.editReply({
          content: unknownUserId
            ? `No staff application found for user ID \`${unknownUserId}\`.`
            : 'No staff application found for that channel.'
        });
      }

      const responses = parseResponses(application.responses);
      const user = await interaction.client.users.fetch(application.staff_id).catch(() => null);
      const applicant = user
        ? { id: user.id, username: user.username, tag: user.tag }
        : { id: application.staff_id, username: 'Unknown user' };

      const metaEmbed = await buildMetaEmbed(application, responses, user, others);
      const embeds = buildStaffApplicationEmbeds(responses, applicant, {
        titlePrefix: 'Staff Application',
        footerText: `Application #${application.id} - ${applicant.tag}`
      });

      await interaction.editReply({ embeds: [metaEmbed] });

      const batches = groupEmbedsIntoMessages(embeds);

      for (const batch of batches) {
        try {
          await interaction.followUp({ embeds: batch, flags: MessageFlags.Ephemeral });
        } catch (sendError) {
          console.error('Error sending staff application answer embeds:', sendError);
          await interaction.followUp({
            content: 'The answer embeds could not be displayed. Re-run this command to try again.',
            flags: MessageFlags.Ephemeral
          }).catch(console.error);
          break;
        }
      }
    } catch (err) {
      console.error('Error in /staffapp-view:', err);
      const content = 'An error occurred while fetching the staff application.';
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content });
        } else {
          await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
      } catch (editError) {
        console.error('Error sending error reply:', editError);
      }
    }
  }
};
