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
    
    if (interaction.customId.startsWith('counter_modal_')) {
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
