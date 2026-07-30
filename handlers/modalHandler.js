import { handleStaffApplicationModal } from './modals/staffApplicationModal.js';
import { handleStaffApplicationStep1 } from './modals/staffApplicationStep1.js';
import { handleStaffApplicationStep2 } from './modals/staffApplicationStep2.js';
import { handleStaffApplicationStep3 } from './modals/staffApplicationStep3.js';
import { handleStaffApplicationStep4 } from './modals/staffApplicationStep4.js';
import { handleStaffApplicationStep5 } from './modals/staffApplicationStep5.js';
import { handleLOAExplanationModal } from './modals/loaExplanationModal.js';
import { handleProofSubmission } from './buttons/proofButton.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } from 'discord.js';
import config from '../config.js';

const applicationData = new Map();
const proofRequestData = new Map();

export { applicationData, proofRequestData };

export async function handleModalSubmit(interaction) {
  if (!interaction.isModalSubmit()) {
    return;
  }
  
  try {
    if (interaction.customId === 'staff_onboarding_modal') {
      const preferredName = interaction.fields.getTextInputValue('preferred_name');
      const minecraftIgn = interaction.fields.getTextInputValue('minecraft_ign');
      const timezone = interaction.fields.getTextInputValue('timezone');
      
      const embed = new EmbedBuilder()
        .setTitle('New Staff Onboarding Submission')
        .setColor(0x3498DB)
        .addFields(
          { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
          { name: 'Preferred Name', value: preferredName, inline: true },
          { name: 'Minecraft IGN', value: minecraftIgn, inline: true },
          { name: 'Timezone', value: timezone, inline: true }
        )
        .setTimestamp();
      
      const acceptButton = new ButtonBuilder()
        .setCustomId(`staff_onboarding_accept_${interaction.user.id}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success);
      
      const denyButton = new ButtonBuilder()
        .setCustomId(`staff_onboarding_deny_${interaction.user.id}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger);
      
      const row = new ActionRowBuilder().addComponents(acceptButton, denyButton);
      
      const logChannel = await interaction.client.channels.fetch(config.channels.staffServer.staffDetailsChannelId).catch(() => null);
      if (logChannel) {
        await logChannel.send({ embeds: [embed], components: [row] });
      }
      
      await interaction.reply({ 
        content: '✅ Thank you for submitting your onboarding information! Management will review your details and set you up with the right role shortly.', 
        flags: 64 
      });
      return;
    }
    
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
        content: '✅ Step 1/5 completed! Click below to continue to step 2.', 
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
        content: '✅ Step 2/5 completed! Click below to continue to step 3.', 
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
        content: '✅ Step 3/5 completed! Click below to continue to step 4.', 
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
        content: '✅ Step 4/5 completed! Click below to continue to step 5.', 
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
      applicationData.set(interaction.user.id, data);
      
      await handleStaffApplicationModal(interaction, data);
      applicationData.delete(interaction.user.id);
      return;
    }
    
    if (interaction.customId.startsWith('loa_explanation_')) {
      return await handleLOAExplanationModal(interaction);
    }
    
    if (interaction.customId === 'proof_modal') {
      const proofRequest = proofRequestData.get(interaction.user.id);
      if (!proofRequest) {
        return interaction.reply({ 
          content: 'Error: Could not find proof request. Please try again.', 
          flags: 64 
        });
      }
      
      proofRequestData.delete(interaction.user.id);
      return await handleProofSubmission(interaction, proofRequest);
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
