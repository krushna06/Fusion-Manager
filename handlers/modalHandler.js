import { handleStaffApplicationModal } from './modals/staffApplicationModal.js';
import { handleStaffApplicationStep1 } from './modals/staffApplicationStep1.js';
import { handleStaffApplicationStep2 } from './modals/staffApplicationStep2.js';
import { handleStaffApplicationStep3 } from './modals/staffApplicationStep3.js';
import { handleStaffApplicationStep4 } from './modals/staffApplicationStep4.js';
import { handleStaffApplicationStep5 } from './modals/staffApplicationStep5.js';
import { handleStaffApplicationStep6 } from './modals/staffApplicationStep6.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const applicationData = new Map();

export { applicationData };

export async function handleModalSubmit(interaction) {
  if (!interaction.isModalSubmit()) {
    return;
  }
  
  try {
    if (interaction.customId === 'staff_application_modal') {
      return await handleStaffApplicationModal(interaction);
    }
    
    if (interaction.customId === 'staff_application_modal_step1') {
      const data = applicationData.get(interaction.user.id) || {};
      data.ign = interaction.fields.getTextInputValue('ign');
      data.accountType = interaction.fields.getTextInputValue('account_type');
      data.age = interaction.fields.getTextInputValue('age');
      data.discordId = interaction.fields.getTextInputValue('discord_id');
      data.email = interaction.fields.getTextInputValue('email');
      applicationData.set(interaction.user.id, data);
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_app_step2')
            .setLabel('Continue to Step 2')
            .setStyle(ButtonStyle.Primary)
        );
      
      await interaction.reply({ 
        content: '✅ Step 1/6 completed! Click below to continue to step 2.', 
        components: [row],
        flags: 64 
      });
      return;
    }
    
    if (interaction.customId === 'staff_application_modal_step2') {
      const data = applicationData.get(interaction.user.id) || {};
      data.region = interaction.fields.getTextInputValue('region');
      data.country = interaction.fields.getTextInputValue('country');
      data.timezone = interaction.fields.getTextInputValue('timezone');
      data.mic = interaction.fields.getTextInputValue('mic');
      data.recording = interaction.fields.getTextInputValue('recording');
      applicationData.set(interaction.user.id, data);
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_app_step3')
            .setLabel('Continue to Step 3')
            .setStyle(ButtonStyle.Primary)
        );
      
      await interaction.reply({ 
        content: '✅ Step 2/6 completed! Click below to continue to step 3.', 
        components: [row],
        flags: 64 
      });
      return;
    }
    
    if (interaction.customId === 'staff_application_modal_step3') {
      const data = applicationData.get(interaction.user.id) || {};
      data.languages = interaction.fields.getTextInputValue('languages');
      data.timeInGame = interaction.fields.getTextInputValue('time_ingame');
      data.timeDiscord = interaction.fields.getTextInputValue('time_discord');
      data.altAccounts = interaction.fields.getTextInputValue('alt_accounts');
      data.sharedAccount = interaction.fields.getTextInputValue('shared_account');
      applicationData.set(interaction.user.id, data);
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_app_step4')
            .setLabel('Continue to Step 4')
            .setStyle(ButtonStyle.Primary)
        );
      
      await interaction.reply({ 
        content: '✅ Step 3/6 completed! Click below to continue to step 4.', 
        components: [row],
        flags: 64 
      });
      return;
    }
    
    if (interaction.customId === 'staff_application_modal_step4') {
      const data = applicationData.get(interaction.user.id) || {};
      data.currentStaff = interaction.fields.getTextInputValue('current_staff');
      data.staffExperience = interaction.fields.getTextInputValue('staff_experience');
      data.bestMemory = interaction.fields.getTextInputValue('best_memory');
      data.improvements = interaction.fields.getTextInputValue('improvements');
      data.motivation = interaction.fields.getTextInputValue('motivation');
      applicationData.set(interaction.user.id, data);
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_app_step5')
            .setLabel('Continue to Step 5')
            .setStyle(ButtonStyle.Primary)
        );
      
      await interaction.reply({ 
        content: '✅ Step 4/6 completed! Click below to continue to step 5.', 
        components: [row],
        flags: 64 
      });
      return;
    }
    
    if (interaction.customId === 'staff_application_modal_step5') {
      const data = applicationData.get(interaction.user.id) || {};
      data.skills = interaction.fields.getTextInputValue('skills');
      data.strengthsWeaknesses = interaction.fields.getTextInputValue('strengths_weaknesses');
      data.whyAccept = interaction.fields.getTextInputValue('why_accept');
      data.scenario1 = interaction.fields.getTextInputValue('scenario1');
      data.scenario2 = interaction.fields.getTextInputValue('scenario2');
      applicationData.set(interaction.user.id, data);
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_app_step6')
            .setLabel('Continue to Step 6')
            .setStyle(ButtonStyle.Primary)
        );
      
      await interaction.reply({ 
        content: '✅ Step 5/6 completed! Click below to continue to step 6.', 
        components: [row],
        flags: 64 
      });
      return;
    }
    
    if (interaction.customId === 'staff_application_modal_step6') {
      const data = applicationData.get(interaction.user.id) || {};
      data.scenario3 = interaction.fields.getTextInputValue('scenario3');
      data.scenario4 = interaction.fields.getTextInputValue('scenario4');
      data.scenario5 = interaction.fields.getTextInputValue('scenario5');
      data.scenario6 = interaction.fields.getTextInputValue('scenario6');
      applicationData.set(interaction.user.id, data);
      
      await handleStaffApplicationModal(interaction, data);
      applicationData.delete(interaction.user.id);
      return;
    }
    
    console.log('No handler found for modal:', interaction.customId);
  } catch (error) {
    console.error('Error in modal handler:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request. Please try again later.',
        flags: 64
      }).catch(console.error);
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ An error occurred while processing your request. Please try again later.'
      }).catch(console.error);
    }
  }
}
