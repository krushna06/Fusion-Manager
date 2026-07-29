import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export async function handleStaffApplicationStep4(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('staff_application_modal_step4')
    .setTitle('Staff Application - Step 4/5');

  const currentStaffInput = new TextInputBuilder()
    .setCustomId('current_staff')
    .setLabel('Staff on other servers? List them')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const staffExperienceInput = new TextInputBuilder()
    .setCustomId('staff_experience')
    .setLabel('Past staff experience? List servers')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const bestMemoryInput = new TextInputBuilder()
    .setCustomId('best_memory')
    .setLabel('Best memory & favourite gamemodes?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const improvementsInput = new TextInputBuilder()
    .setCustomId('improvements')
    .setLabel('Suggestions to improve Fusion Network?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const motivationInput = new TextInputBuilder()
    .setCustomId('motivation')
    .setLabel('What motivated you to apply for staff?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(currentStaffInput),
    new ActionRowBuilder().addComponents(staffExperienceInput),
    new ActionRowBuilder().addComponents(bestMemoryInput),
    new ActionRowBuilder().addComponents(improvementsInput),
    new ActionRowBuilder().addComponents(motivationInput)
  );

  await interaction.showModal(modal);
}
