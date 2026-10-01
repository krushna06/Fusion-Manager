import { getStaffApplicationByChannel, updateApplicationQuestionStep, updateApplicationState, updateApplicationResponses } from '../../../database/mainDb.js';
import { deleteStaffApplication } from '../../../database/models/staffApplication.js';
import { staffApplicationQuestions } from '../../../utils/staffApplicationQuestions.js';
import { buildStaffApplicationEmbeds, buildStaffApplicationText } from '../../../utils/staffApplicationEmbeds.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';

export const questionTimestamps = new Map();

const processingChannels = new Set();

const SUBMIT_MARKER = 'New staff application submitted!';

function clearChannelTimestamps(channelId) {
  for (const [key] of questionTimestamps) {
    if (key.startsWith(`${channelId}_`)) {
      questionTimestamps.delete(key);
    }
  }
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

async function hasSubmittedMessage(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 25 });
    return messages.some(msg => msg.author.id === channel.client.user.id && msg.content === SUBMIT_MARKER);
  } catch (error) {
    console.error('Error checking for existing submission message:', error);
    return false;
  }
}

function buildDecisionRow(channelId) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_accept_${channelId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`staff_reject_${channelId}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`staff_bgcheck_${channelId}`)
        .setLabel('Background Check')
        .setStyle(ButtonStyle.Primary)
    );
}

async function postAsFile(channel, responses, author) {
  const buffer = Buffer.from(buildStaffApplicationText(responses, author), 'utf-8');
  return channel.send({
    content: 'The application embeds could not be posted, so the answers are attached as a text file instead.',
    files: [new AttachmentBuilder(buffer, { name: 'staff-application-responses.txt' })]
  });
}

async function finalizeApplication(message, responses) {
  const channel = message.channel;

  if (await hasSubmittedMessage(channel)) {
    await updateApplicationState(channel.id, 'submitted');
    await updateApplicationQuestionStep(channel.id, -1);
    clearChannelTimestamps(channel.id);
    return;
  }

  let posted = false;
  try {
    const embeds = buildStaffApplicationEmbeds(responses, message.author, {
      footerText: `Application channel: ${channel.name}`
    });
    await channel.send({
      content: SUBMIT_MARKER,
      embeds,
      components: [buildDecisionRow(channel.id)]
    });
    posted = true;
  } catch (error) {
    console.error('Error sending staff application summary embed:', error);
    try {
      await postAsFile(channel, responses, message.author);
      posted = true;
    } catch (fileError) {
      console.error('Error sending staff application responses as file:', fileError);
    }
  }

  await updateApplicationState(channel.id, 'submitted');
  await updateApplicationQuestionStep(channel.id, -1);
  clearChannelTimestamps(channel.id);

  if (!posted) {
    await channel.send({
      content: `<@${message.author.id}> Your answers were saved, but the summary could not be posted. Staff can retrieve them with \`/staffapp-view\` using your user ID (\`${message.author.id}\`).`
    }).catch(console.error);
  }

  const confirmEmbed = new EmbedBuilder()
    .setTitle('Staff Application Submitted')
    .setColor(0x5865F2)
    .setDescription(`<@${message.author.id}> Your staff application has been submitted. The staff team will review it and get back to you soon.`)
    .setTimestamp();

  await channel.send({ content: `<@${message.author.id}>`, embeds: [confirmEmbed] }).catch(console.error);
}

export async function handleStaffApplicationMessage(message) {
  const channelId = message.channel.id;

  if (processingChannels.has(channelId)) {
    await message.delete().catch(console.error);
    return;
  }

  processingChannels.add(channelId);

  try {
    const application = await getStaffApplicationByChannel(channelId);

    if (!application) {
      try {
        const channel = await message.guild.channels.fetch(channelId).catch(() => null);
        if (!channel) {
          try {
            await deleteStaffApplication(channelId);
          } catch (deleteError) {
            console.error('Error deleting orphaned staff application:', deleteError);
          }
        }
      } catch (error) {
        console.error('Error checking channel existence:', error);
      }
      return;
    }

    if (application.staff_id !== message.author.id) {
      return;
    }

    if (application.application_state !== 'collecting') {
      return;
    }

    const currentStep = application.current_question_step || 0;

    if (currentStep === 0) {
      return;
    }

    const questionIndex = currentStep - 1;
    const currentQuestion = staffApplicationQuestions[questionIndex];

    if (!currentQuestion) {
      return;
    }

    const questionKey = `${channelId}_${currentStep}`;
    let questionAskedAt = questionTimestamps.get(questionKey);

    if (!questionAskedAt) {
      try {
        const messages = await message.channel.messages.fetch({ limit: 20 });
        const questionMessage = messages.find(msg =>
          msg.author.id === message.client.user.id &&
          msg.content.includes(`**Question ${currentStep}/`)
        );

        if (!questionMessage) {
          const sentMessage = await message.channel.send({
            content: `**Question ${currentStep}/${staffApplicationQuestions.length}**: ${currentQuestion.label}`
          });
          questionTimestamps.set(questionKey, sentMessage.createdTimestamp);
          await message.delete().catch(console.error);
          return;
        }

        questionTimestamps.set(questionKey, questionMessage.createdTimestamp);
        questionAskedAt = questionMessage.createdTimestamp;
      } catch (fetchError) {
        console.error('Error resolving question timestamp:', fetchError);
        questionTimestamps.set(questionKey, message.createdTimestamp);
        questionAskedAt = message.createdTimestamp;
      }
    }

    if (message.createdTimestamp < questionAskedAt) {
      await message.delete().catch(console.error);
      return;
    }

    const responses = parseResponses(application.responses);
    const nextStep = currentStep + 1;
    const isFinalQuestion = nextStep > staffApplicationQuestions.length;

    const alreadyAnswered = Boolean(responses[currentQuestion.id]);

    if (!alreadyAnswered) {
      responses[currentQuestion.id] = message.content;
      await updateApplicationResponses(channelId, responses);
    }

    if (isFinalQuestion) {
      await finalizeApplication(message, responses);
      return;
    }

    if (!alreadyAnswered) {
      try {
        const messages = await message.channel.messages.fetch({ limit: 10 });
        const questionMessage = messages.find(msg =>
          msg.author.id === message.client.user.id &&
          msg.content.includes(`**Question ${currentStep}/`)
        );
        if (questionMessage) {
          await questionMessage.delete().catch(console.error);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up question message:', cleanupError);
      }

      await message.delete().catch(console.error);
    }

    await updateApplicationQuestionStep(channelId, nextStep);
    const nextQuestion = staffApplicationQuestions[nextStep - 1];

    const sentMessage = await message.channel.send({
      content: `**Question ${nextStep}/${staffApplicationQuestions.length}**: ${nextQuestion.label}`
    });

    questionTimestamps.set(`${channelId}_${nextStep}`, sentMessage.createdTimestamp);
  } catch (error) {
    console.error('Error handling staff application message:', error);
  } finally {
    processingChannels.delete(channelId);
  }
}
