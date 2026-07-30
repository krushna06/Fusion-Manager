import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export async function showProofModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('proof_modal')
    .setTitle('Attach Proof Link');

  const proofInput = new TextInputBuilder()
    .setCustomId('proof_link')
    .setLabel('Proof Link')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://postimg.cc/')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(proofInput)
  );

  await interaction.showModal(modal);
}
