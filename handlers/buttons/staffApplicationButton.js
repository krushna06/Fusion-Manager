import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getStaffApplicationByUser } from '../../database/mainDb.js';

let linkerDb = null;

export function setLinkerDependencies(db) {
  linkerDb = db;
}

export async function handleStaffApplicationButton(interaction) {
  if (!linkerDb) {
    return interaction.reply({ 
      content: 'The linking system is not available. Please try again later.', 
      flags: 64 
    });
  }

  const existingApp = await getStaffApplicationByUser(interaction.user.id);
  if (existingApp) {
    if (existingApp.status === 'pending' || existingApp.status === 'accepted') {
      if (existingApp.channel_id) {
        return interaction.reply({ 
          content: `You already have an active staff application in <#${existingApp.channel_id}>. Please use that channel.`, 
          flags: 64 
        });
      }
    }
    
    if (existingApp.status === 'rejected' && existingApp.rejected_at) {
      const rejectedDate = new Date(existingApp.rejected_at);
      const daysSinceRejection = Math.floor((new Date() - rejectedDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceRejection < 30) {
        const daysRemaining = 30 - daysSinceRejection;
        return interaction.reply({ 
          content: `Your staff application was rejected ${daysSinceRejection} day(s) ago. You must wait ${daysRemaining} more day(s) before applying again.`, 
          flags: 64 
        });
      }
    }
  }

  const linkData = await linkerDb.getLinkByDiscord(interaction.user.id);
  if (!linkData) {
    return interaction.reply({ 
      content: 'You need to link your Minecraft account to Discord before applying for staff. Use /link in game first.', 
      flags: 64 
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('staff_application_modal')
    .setTitle('Staff Application');

  const minecraftUsernameInput = new TextInputBuilder()
    .setCustomId('minecraft_username')
    .setLabel('Minecraft Username')
    .setValue(linkData.username)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const whyApplyInput = new TextInputBuilder()
    .setCustomId('why_apply')
    .setLabel('Why do you want to apply for staff?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const experienceInput = new TextInputBuilder()
    .setCustomId('experience')
    .setLabel('What experience do you have with moderating?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const availabilityInput = new TextInputBuilder()
    .setCustomId('availability')
    .setLabel('How many hours per week can you dedicate?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  const additionalInfoInput = new TextInputBuilder()
    .setCustomId('additional_info')
    .setLabel('Additional information')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000);

  const firstRow = new ActionRowBuilder().addComponents(minecraftUsernameInput);
  const secondRow = new ActionRowBuilder().addComponents(whyApplyInput);
  const thirdRow = new ActionRowBuilder().addComponents(experienceInput);
  const fourthRow = new ActionRowBuilder().addComponents(availabilityInput);
  const fifthRow = new ActionRowBuilder().addComponents(additionalInfoInput);

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

  await interaction.showModal(modal);
}
