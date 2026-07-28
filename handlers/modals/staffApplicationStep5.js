import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export async function handleStaffApplicationStep5(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('staff_application_modal_step5')
    .setTitle('Staff Application - Step 5/6');

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

  const scenario1Input = new TextInputBuilder()
    .setCustomId('scenario1')
    .setLabel('Scenario 1: Kill-aura in PvP arena')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const scenario2Input = new TextInputBuilder()
    .setCustomId('scenario2')
    .setLabel('Scenario 2: Toxic argument in chat')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(skillsInput),
    new ActionRowBuilder().addComponents(strengthsWeaknessesInput),
    new ActionRowBuilder().addComponents(whyAcceptInput),
    new ActionRowBuilder().addComponents(scenario1Input),
    new ActionRowBuilder().addComponents(scenario2Input)
  );

  await interaction.showModal(modal);
}
