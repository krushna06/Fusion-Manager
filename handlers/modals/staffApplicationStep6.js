import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export async function handleStaffApplicationStep6(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('staff_application_modal_step6')
    .setTitle('Staff Application - Step 6/6');

  const scenario3Input = new TextInputBuilder()
    .setCustomId('scenario3')
    .setLabel('Scenario 3: Bug refund request')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const scenario4Input = new TextInputBuilder()
    .setCustomId('scenario4')
    .setLabel('Scenario 4: Friend asks to overlook violation')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const scenario5Input = new TextInputBuilder()
    .setCustomId('scenario5')
    .setLabel('Scenario 5: Your unique motivation & skills')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const scenario6Input = new TextInputBuilder()
    .setCustomId('scenario6')
    .setLabel('Scenario 6: Weekly availability & balance')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(scenario3Input),
    new ActionRowBuilder().addComponents(scenario4Input),
    new ActionRowBuilder().addComponents(scenario5Input),
    new ActionRowBuilder().addComponents(scenario6Input)
  );

  await interaction.showModal(modal);
}
