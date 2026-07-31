import { getStaffApplicationByChannel, updateApplicationQuestionStep, updateApplicationState, updateApplicationResponses } from '../../database/mainDb.js';
import { deleteStaffApplication } from '../../database/models/staffApplication.js';
import { staffApplicationQuestions } from '../../utils/staffApplicationQuestions.js';
import { questionTimestamps } from '../../events/message/staffApplication/staffAppMessageCreate.js';

const processingChannels = new Set();

export async function handleStaffAppStartButton(interaction) {
  const channelId = interaction.channel.id;
  
  if (processingChannels.has(channelId)) {
    if (!interaction.replied) {
      try {
        await interaction.reply({ 
          content: 'Application is already starting. Please wait a moment.', 
          flags: 64 
        });
      } catch (err) {
        console.error('Error in duplicate start check:', err);
      }
    }
    return;
  }
  
  processingChannels.add(channelId);
  
  try {
    const application = await getStaffApplicationByChannel(channelId);
    
    if (!application) {
      try {
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
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
      
      if (!interaction.replied) {
        return interaction.reply({ 
          content: 'Application not found.', 
          flags: 64 
        });
      }
      return;
    }

    if (application.staff_id !== interaction.user.id) {
      if (!interaction.replied) {
        return interaction.reply({ 
          content: 'This is not your application channel.', 
          flags: 64 
        });
      }
      return;
    }

    if (application.application_state !== 'collecting') {
      if (!interaction.replied) {
        return interaction.reply({ 
          content: 'This application has already been submitted.', 
          flags: 64 
        });
      }
      return;
    }

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferUpdate();
      }
    } catch (err) {
      console.error('Error deferring start button interaction:', err);
    }

    for (const [key] of questionTimestamps) {
      if (key.startsWith(`${channelId}_`)) {
        questionTimestamps.delete(key);
      }
    }
    
    await updateApplicationQuestionStep(channelId, 1);

    const firstQuestion = staffApplicationQuestions[0];
    const sentMessage = await interaction.channel.send({
      content: `**Question 1/${staffApplicationQuestions.length}**: ${firstQuestion.label}`
    });
    
    const questionKey = `${channelId}_1`;
    questionTimestamps.set(questionKey, sentMessage.createdTimestamp);
  } finally {
    processingChannels.delete(channelId);
  }
}
