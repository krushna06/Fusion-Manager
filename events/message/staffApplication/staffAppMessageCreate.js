import { getStaffApplicationByChannel, updateApplicationQuestionStep, updateApplicationState, updateApplicationResponses } from '../../../database/mainDb.js';
import { staffApplicationQuestions } from '../../../utils/staffApplicationQuestions.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const questionTimestamps = new Map();

const processingChannels = new Set();

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

    const questionKey = `${message.channel.id}_${currentStep}`;
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
        } else {
          questionTimestamps.set(questionKey, questionMessage.createdTimestamp);
          questionAskedAt = questionMessage.createdTimestamp;
        }
      } catch (fetchError) {
        questionTimestamps.set(questionKey, Date.now());
        questionAskedAt = Date.now();
        questionTimestamps.set(questionKey, Date.now());
        questionAskedAt = Date.now();
      }
    }
    
    if (message.createdTimestamp < questionAskedAt) {
      await message.delete().catch(console.error);
      return;
    }

    let responses = {};
    if (application.responses) {
      try {
        responses = JSON.parse(application.responses);
      } catch (e) {
        responses = {};
      }
    }

    if (responses[currentQuestion.id]) {
      const nextStep = currentStep + 1;
      
      if (nextStep > staffApplicationQuestions.length) {
        await updateApplicationState(message.channel.id, 'submitted');
        await updateApplicationQuestionStep(message.channel.id, -1);
        
        for (const [key] of questionTimestamps) {
          if (key.startsWith(`${message.channel.id}_`)) {
            questionTimestamps.delete(key);
          }
        }
        
        const messages = await message.channel.messages.fetch({ limit: 5 });
        const alreadySubmitted = messages.some(msg => 
          msg.author.id === message.client.user.id && 
          msg.content === 'New staff application submitted!'
        );
        
        if (alreadySubmitted) {
          return;
        }
        
        const embed = new EmbedBuilder()
          .setTitle('Staff Application Submitted')
          .setColor(0x5865F2)
          .setDescription(`<@${message.author.id}> Your staff application has been submitted. The staff team will review it and get back to you soon.`)
          .setTimestamp();

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`staff_accept_${message.channel.id}`)
              .setLabel('Accept')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`staff_reject_${message.channel.id}`)
              .setLabel('Reject')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`staff_bgcheck_${message.channel.id}`)
              .setLabel('Background Check')
              .setStyle(ButtonStyle.Primary)
        );

        const applicationEmbeds = generateApplicationEmbed(responses, message.author);
        
        await message.channel.send({
          content: 'New staff application submitted!',
          embeds: applicationEmbeds,
          components: [row]
        });

        await message.channel.send({
          content: `<@${message.author.id}>`,
          embeds: [embed]
        });
      } else {
        await updateApplicationQuestionStep(message.channel.id, nextStep);
        const nextQuestion = staffApplicationQuestions[nextStep - 1];
        
        const sentMessage = await message.channel.send({
          content: `**Question ${nextStep}/${staffApplicationQuestions.length}**: ${nextQuestion.label}`
        });
        
        const nextQuestionKey = `${message.channel.id}_${nextStep}`;
        questionTimestamps.set(nextQuestionKey, sentMessage.createdTimestamp);
      }
      return;
    }

    responses[currentQuestion.id] = message.content;
    await updateApplicationResponses(message.channel.id, responses);

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
    }

    await message.delete().catch(console.error);

    const nextStep = currentStep + 1;

    if (nextStep > staffApplicationQuestions.length) {
      await updateApplicationState(message.channel.id, 'submitted');
      await updateApplicationQuestionStep(message.channel.id, -1);
      
      for (const [key] of questionTimestamps) {
        if (key.startsWith(`${message.channel.id}_`)) {
          questionTimestamps.delete(key);
        }
      }
      
      const messages = await message.channel.messages.fetch({ limit: 5 });
      const alreadySubmitted = messages.some(msg => 
        msg.author.id === message.client.user.id && 
        msg.content === 'New staff application submitted!'
      );
      
      if (alreadySubmitted) {
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('Staff Application Submitted')
        .setColor(0x5865F2)
        .setDescription(`<@${message.author.id}> Your staff application has been submitted. The staff team will review it and get back to you soon.`)
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`staff_accept_${message.channel.id}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`staff_reject_${message.channel.id}`)
            .setLabel('Reject')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`staff_bgcheck_${message.channel.id}`)
            .setLabel('Background Check')
            .setStyle(ButtonStyle.Primary)
      );

      const applicationEmbeds = generateApplicationEmbed(responses, message.author);
      
      await message.channel.send({
        content: 'New staff application submitted!',
        embeds: applicationEmbeds,
        components: [row]
      });

      await message.channel.send({
        content: `<@${message.author.id}>`,
        embeds: [embed]
      });
    } else {
      await updateApplicationQuestionStep(message.channel.id, nextStep);
      const nextQuestion = staffApplicationQuestions[nextStep - 1];
      
      const sentMessage = await message.channel.send({
        content: `**Question ${nextStep}/${staffApplicationQuestions.length}**: ${nextQuestion.label}`
      });
      
      const nextQuestionKey = `${message.channel.id}_${nextStep}`;
      questionTimestamps.set(nextQuestionKey, sentMessage.createdTimestamp);
    }
  } finally {
    processingChannels.delete(channelId);
  }
}

function generateApplicationEmbed(responses, user) {
  const basicInfoQuestions = staffApplicationQuestions.slice(0, 10);
  const timeAccountsQuestions = staffApplicationQuestions.slice(10, 16);
  const experienceAboutQuestions = staffApplicationQuestions.slice(16, 22);
  const scenarioQuestions = staffApplicationQuestions.slice(22);
  
  const truncateFieldName = (name) => {
    if (name.length <= 256) return name;
    return name.substring(0, 253) + '...';
  };
  
  const embed1 = new EmbedBuilder()
    .setTitle(`Staff Application - ${responses.ign || user.username}`)
    .setColor(0x5865F2)
    .addFields(
      { name: 'Discord User', value: `<@${user.id}>`, inline: false },
      ...basicInfoQuestions.map(q => ({
        name: truncateFieldName(q.label),
        value: q.id === 'ign' ? (responses.ign || responses.minecraft_username || 'Not provided') : (responses[q.id] || 'Not provided'),
        inline: false
      }))
    )
    .setTimestamp();

  const embed2 = new EmbedBuilder()
    .setTitle('Staff Application - Time & Accounts')
    .setColor(0x5865F2)
    .addFields(
      ...timeAccountsQuestions.map(q => ({
        name: truncateFieldName(q.label),
        value: responses[q.id] || 'Not provided',
        inline: false
      }))
    );

  const embed3 = new EmbedBuilder()
    .setTitle('Staff Application - Experience & About You')
    .setColor(0x5865F2)
    .addFields(
      ...experienceAboutQuestions.map(q => ({
        name: truncateFieldName(q.label),
        value: responses[q.id] || 'Not provided',
        inline: false
      }))
    );

  const embed4 = new EmbedBuilder()
    .setTitle('Staff Application - Scenarios & Commitment')
    .setColor(0x5865F2)
    .addFields(
      ...scenarioQuestions.map(q => ({
        name: truncateFieldName(q.label),
        value: responses[q.id] || 'Not provided',
        inline: false
      }))
    );

  return [embed1, embed2, embed3, embed4];
}
