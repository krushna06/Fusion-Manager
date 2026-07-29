import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

let linkerDb = null;

export function setLinkerDependencies(db) {
  linkerDb = db;
}

export async function handleStaffApplicationStep1(interaction, db = linkerDb) {
  const dbToUse = db || linkerDb;
  if (!dbToUse) {
    return interaction.reply({ 
      content: 'The linking system is not available. Please try again later.', 
      flags: 64 
    });
  }

  const linkData = await dbToUse.getLinkByDiscord(interaction.user.id);
  if (!linkData) {
    return interaction.reply({ 
      content: 'You need to link your Minecraft account to Discord before applying for staff. Use /link in game first.', 
      flags: 64 
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('staff_application_modal_step1')
    .setTitle('Staff Application - Step 1/5');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('Minecraft IGN (Username)?')
    .setValue(linkData.username)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const accountTypeInput = new TextInputBuilder()
    .setCustomId('account_type')
    .setLabel('Premium or Cracked account?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const ageInput = new TextInputBuilder()
    .setCustomId('age')
    .setLabel('Your age?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const discordIdInput = new TextInputBuilder()
    .setCustomId('discord_id')
    .setLabel('Discord ID?')
    .setValue(interaction.user.id)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const emailInput = new TextInputBuilder()
    .setCustomId('email')
    .setLabel('Email address?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(ignInput),
    new ActionRowBuilder().addComponents(accountTypeInput),
    new ActionRowBuilder().addComponents(ageInput),
    new ActionRowBuilder().addComponents(discordIdInput),
    new ActionRowBuilder().addComponents(emailInput)
  );

  await interaction.showModal(modal);
}
