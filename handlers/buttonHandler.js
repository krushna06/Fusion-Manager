import { handleSuggestionButton } from './buttons/suggestionButton.js';

export async function handleButtonInteraction(interaction) {
  if (!interaction.isButton()) return;
  
  if (interaction.customId.startsWith('suggestion_')) {
    return handleSuggestionButton(interaction);
  }
  
}
