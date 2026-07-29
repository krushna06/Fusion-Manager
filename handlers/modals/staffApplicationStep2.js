import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export async function handleStaffApplicationStep2(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('staff_application_modal_step2')
    .setTitle('Staff Application - Step 2/5');

  const regionInput = new TextInputBuilder()
    .setCustomId('region')
    .setLabel('What region are you from?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const countryInput = new TextInputBuilder()
    .setCustomId('country')
    .setLabel('Which country do you live in?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const timezoneInput = new TextInputBuilder()
    .setCustomId('timezone')
    .setLabel('Your timezone?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const micInput = new TextInputBuilder()
    .setCustomId('mic')
    .setLabel('Working mic & voice call ability?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const recordingInput = new TextInputBuilder()
    .setCustomId('recording')
    .setLabel('Can you record Minecraft videos?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(regionInput),
    new ActionRowBuilder().addComponents(countryInput),
    new ActionRowBuilder().addComponents(timezoneInput),
    new ActionRowBuilder().addComponents(micInput),
    new ActionRowBuilder().addComponents(recordingInput)
  );

  await interaction.showModal(modal);
}
