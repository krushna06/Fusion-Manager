import { handleInteraction } from '../../handlers/interactionHandler.js';

export default {
  once: false,
  async execute(client, interaction) {
    if (!interaction.isCommand()) return;
    
    await handleInteraction(client, interaction);
  }
};
