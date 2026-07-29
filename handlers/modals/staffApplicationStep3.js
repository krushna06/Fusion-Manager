import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export async function handleStaffApplicationStep3(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('staff_application_modal_step3')
    .setTitle('Staff Application - Step 3/5');

  const languagesInput = new TextInputBuilder()
    .setCustomId('languages')
    .setLabel('Languages you speak fluently?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const timeInGameInput = new TextInputBuilder()
    .setCustomId('time_ingame')
    .setLabel('Daily time for in-game moderation?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const timeDiscordInput = new TextInputBuilder()
    .setCustomId('time_discord')
    .setLabel('Daily time for Discord moderation?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const altAccountsInput = new TextInputBuilder()
    .setCustomId('alt_accounts')
    .setLabel('Any alt accounts on Fusion? List IDs')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const sharedAccountInput = new TextInputBuilder()
    .setCustomId('shared_account')
    .setLabel('Ever shared your Minecraft account?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(languagesInput),
    new ActionRowBuilder().addComponents(timeInGameInput),
    new ActionRowBuilder().addComponents(timeDiscordInput),
    new ActionRowBuilder().addComponents(altAccountsInput),
    new ActionRowBuilder().addComponents(sharedAccountInput)
  );

  await interaction.showModal(modal);
}
