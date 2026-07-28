import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import config from '../../config.js';

export default {
  name: 'onboard',
  data: new SlashCommandBuilder()
    .setName('onboard')
    .setDescription('Start the staff onboarding process'),
  async execute(interaction) {
    if (interaction.guild.id !== config.STAFF_GUILD_ID) {
      return interaction.reply({ 
        content: 'This command can only be used in the staff server.', 
        flags: 64 
      });
    }
    
    const modal = new ModalBuilder()
      .setCustomId('staff_onboarding_modal')
      .setTitle('Staff Onboarding');
    
    const preferredName = new TextInputBuilder()
      .setCustomId('preferred_name')
      .setLabel('Preferred Name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('What should we call you?');
    
    const minecraftIgn = new TextInputBuilder()
      .setCustomId('minecraft_ign')
      .setLabel('Minecraft IGN')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Your in-game name');
    
    const timezone = new TextInputBuilder()
      .setCustomId('timezone')
      .setLabel('Timezone')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('e.g., EST, PST, UTC, etc.');
    
    const firstActionRow = new ActionRowBuilder().addComponents(preferredName);
    const secondActionRow = new ActionRowBuilder().addComponents(minecraftIgn);
    const thirdActionRow = new ActionRowBuilder().addComponents(timezone);
    
    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
    
    await interaction.showModal(modal);
  }
};
