import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import { createStaffApplication, getStaffApplicationByUser, updateApplicationState } from '../../database/mainDb.js';
import config from '../../config.js';

export default {
  name: 'create-staffapplication',
  data: new SlashCommandBuilder()
    .setName('create-staffapplication')
    .setDescription('Manually create a staff application for a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to create the staff application for')
        .setRequired(true)
    ),
  async execute(interaction) {
    let hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    
    if (!hasPermission && config.roles.mainServer.staffManagerRole && config.channels.mainServer.guildId) {
      try {
        const mainGuild = await interaction.client.guilds.fetch(config.channels.mainServer.guildId).catch(() => null);
        if (mainGuild) {
          const mainMember = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
          if (mainMember && mainMember.roles.cache.has(config.roles.mainServer.staffManagerRole)) {
            hasPermission = true;
          }
        }
      } catch (err) {
        console.error('Error checking staff manager role in main server:', err);
      }
    }

    if (!hasPermission && config.roles.mainServer.managerRole && config.channels.mainServer.guildId) {
      try {
        const mainGuild = await interaction.client.guilds.fetch(config.channels.mainServer.guildId).catch(() => null);
        if (mainGuild) {
          const mainMember = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
          if (mainMember && mainMember.roles.cache.has(config.roles.mainServer.managerRole)) {
            hasPermission = true;
          }
        }
      } catch (err) {
        console.error('Error checking manager role in main server:', err);
      }
    }

    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.', 
        flags: 64 
      });
    }

    const targetUser = interaction.options.getUser('user');
    if (!targetUser) {
      return interaction.reply({ 
        content: 'Invalid user specified.', 
        flags: 64 
      });
    }

    await interaction.deferReply();

    const existingApp = await getStaffApplicationByUser(targetUser.id);
    if (existingApp) {
      if (existingApp.status === 'pending' || existingApp.status === 'accepted') {
        if (existingApp.channel_id) {
          return interaction.editReply({ 
            content: `User already has an active staff application in <#${existingApp.channel_id}>.`, 
          });
        }
      }
      
      if (existingApp.status === 'rejected' && existingApp.rejected_at) {
        const rejectedDate = new Date(existingApp.rejected_at);
        const daysSinceRejection = Math.floor((new Date() - rejectedDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceRejection < 30) {
          const daysRemaining = 30 - daysSinceRejection;
          return interaction.editReply({ 
            content: `This user's staff application was rejected ${daysSinceRejection} day(s) ago. They must wait ${daysRemaining} more day(s) before applying again.`, 
          });
        }
      }
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
        id: targetUser.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
      ...validManagerRoles.map(role => ({
        id: role.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      }))
    ];

    const channel = await guild.channels.create({
      name: `staff-app-${targetUser.username}`,
      type: 0,
      parent: categoryId,
      permissionOverwrites
    });

    const responses = {
      manually_created: true,
      created_by: interaction.user.id
    };

    await createStaffApplication(channel.id, targetUser.id, targetUser.username, responses);
    await updateApplicationState(channel.id, 'submitted');

    const embed = new EmbedBuilder()
      .setTitle('Staff Application Created')
      .setColor(0x5865F2)
      .setDescription(`Your staff application has been created. This application was manually created by <@${interaction.user.id}>. The staff team will review it and get back to you soon.`)
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`staff_accept_${channel.id}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`staff_reject_${channel.id}`)
          .setLabel('Reject')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`staff_bgcheck_${channel.id}`)
          .setLabel('Background Check')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({
      content: `**Staff Application - ${targetUser.tag}**`,
      embeds: [embed],
      components: [row]
    });

    await interaction.editReply({ 
      content: `Staff application created for ${targetUser.tag} in <#${channel.id}>.`
    });
  }
};
