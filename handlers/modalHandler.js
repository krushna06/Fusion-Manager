import { handleStaffApplicationModal } from './modals/staffApplicationModal.js';

export async function handleModalSubmit(interaction) {
  if (!interaction.isModalSubmit()) {
    return;
  }
  
  try {
    if (interaction.customId === 'staff_application_modal') {
      return await handleStaffApplicationModal(interaction);
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
