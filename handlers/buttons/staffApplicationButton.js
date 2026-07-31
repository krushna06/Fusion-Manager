import { getStaffApplicationByUser, createStaffApplication, updateApplicationQuestionStep, updateApplicationState } from '../../database/mainDb.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import config from '../../config.js';
import { staffApplicationQuestions } from '../../utils/staffApplicationQuestions.js';

let linkerDb = null;
const processingUsers = new Set();

export function setLinkerDependencies(db) {
  linkerDb = db;
}

export async function handleStaffApplicationButton(interaction) {
  const userId = interaction.user.id;
  const interactionId = interaction.id;
  
  if (processingUsers.has(userId)) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: 64 });
      }
      return interaction.editReply({ 
        content: 'Your application is already being processed. Please wait a moment.' 
      });
    } catch (err) {
      console.error('Error in duplicate check:', err);
      return;
    }
  }
  
  processingUsers.add(userId);
  
  try {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: 64 });
      }
    } catch (deferErr) {
      console.error('Error deferring interaction:', deferErr);
    }
    
    if (!linkerDb) {
      return interaction.editReply({ 
        content: 'The linking system is not available. Please try again later.' 
      });
    }

    const existingApp = await getStaffApplicationByUser(userId);
    if (existingApp) {
      if (existingApp.status === 'pending' || existingApp.status === 'accepted') {
        if (existingApp.channel_id) {
          return interaction.editReply({ 
            content: `You already have an active staff application in <#${existingApp.channel_id}>. Please use that channel.` 
          });
        }
      }
      
      if (existingApp.status === 'rejected' && existingApp.rejected_at) {
        const rejectedDate = new Date(existingApp.rejected_at);
        const daysSinceRejection = Math.floor((new Date() - rejectedDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceRejection < 30) {
          const daysRemaining = 30 - daysSinceRejection;
          return interaction.editReply({ 
            content: `Your staff application was rejected ${daysSinceRejection} day(s) ago. You must wait ${daysRemaining} more day(s) before applying again.` 
          });
        }
      }
    }

    const linkData = await linkerDb.getLinkByDiscord(userId);
    if (!linkData) {
      return interaction.editReply({ 
        content: 'You need to link your Minecraft account to Discord before applying for staff. Use /link in game first.' 
      });
    }

    const recentApp = await getStaffApplicationByUser(userId);
    if (recentApp && recentApp.status === 'pending' && recentApp.channel_id) {
      return interaction.editReply({ 
        content: `You already have an active staff application in <#${recentApp.channel_id}>. Please use that channel.` 
      });
    }

    const guild = interaction.guild;
    const categoryId = config.channels.mainServer.staffApplicationCategoryId;

    if (!categoryId) {
      return interaction.editReply({ content: 'Staff application category ID not configured. Please contact an admin.' });
    }

    const category = await guild.channels.fetch(categoryId).catch(() => null);
    if (!category) {
      return interaction.editReply({ content: 'Staff application category not found. Please contact an admin.' });
    }

    const managerRoles = Array.isArray(config.roles.mainServer.staffManagerRole) 
      ? config.roles.mainServer.staffManagerRole 
      : [config.roles.mainServer.staffManagerRole];
    const validManagerRoles = [];

    for (const roleId of managerRoles) {
      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (role) {
        validManagerRoles.push(role);
      }
    }

    if (validManagerRoles.length === 0) {
      return interaction.editReply({ content: 'Manager role not found. Please contact an admin.' });
    }

    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
      ...validManagerRoles.map(role => ({
        id: role.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      }))
    ];

    const channel = await guild.channels.create({
      name: `staff-app-${interaction.user.username}`,
      type: 0,
      parent: categoryId,
      permissionOverwrites
    });

    const responses = {
      discord_id: interaction.user.id
    };

    await createStaffApplication(channel.id, interaction.user.id, linkData.username, responses);
    await updateApplicationQuestionStep(channel.id, 0);
    await updateApplicationState(channel.id, 'collecting');

    const embed = new EmbedBuilder()
      .setTitle('Staff Application Created')
      .setColor(0x5865F2)
      .setDescription(`Your staff application has been created. To continue with the application, please answer the following questions.`)
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`staff_start_${channel.id}`)
          .setLabel('Start')
          .setStyle(ButtonStyle.Success)
      );

    await channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [row]
    });

    await interaction.editReply({ 
      content: `Your staff application has been created successfully! Please check <#${channel.id}> to get started.`
    });
  } finally {
    processingUsers.delete(userId);
  }
}
