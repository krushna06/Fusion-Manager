import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export async function handleStaffApplicationStep5(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('staff_application_modal_step5')
    .setTitle('Staff Application - Step 5/5');

  const skillsInput = new TextInputBuilder()
    .setCustomId('skills')
    .setLabel('Relevant staff experience & skills?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const strengthsWeaknessesInput = new TextInputBuilder()
    .setCustomId('strengths_weaknesses')
    .setLabel('Biggest strengths and weaknesses?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const whyAcceptInput = new TextInputBuilder()
    .setCustomId('why_accept')
    .setLabel('Why accept you over others?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(skillsInput),
    new ActionRowBuilder().addComponents(strengthsWeaknessesInput),
    new ActionRowBuilder().addComponents(whyAcceptInput)
  );

  await interaction.showModal(modal);
}
