import { handleButtonInteraction } from './buttonHandler.js';
import { handleModalSubmit } from './modalHandler.js';

export async function handleInteraction(client, interaction) {
  if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
    return;
  }
  
  if (interaction.isModalSubmit()) {
    await handleModalSubmit(interaction);
    return;
  }
  
  if (!interaction.isCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    if (error.code === 10062) {
      console.log('Interaction has expired, cannot send error response');
      return;
    }
    
    const errorMessage = { 
      content: 'There was an error executing this command!', 
      flags: 64 
    };
    
    if (interaction.replied || interaction.deferred) {
      try {
        await interaction.followUp(errorMessage);
      } catch (followUpError) {
        if (followUpError.code !== 10062) {
          console.error('Error sending follow-up error message:', followUpError);
        }
      }
    } else {
      try {
        await interaction.reply(errorMessage);
      } catch (replyError) {
        if (replyError.code !== 10062) {
          console.error('Error sending error reply:', replyError);
        }
      }
    }
  }
}
