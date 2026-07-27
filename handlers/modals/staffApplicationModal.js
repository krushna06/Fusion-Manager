import { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createStaffApplication, updateStaffApplicationStatus } from '../../database/mainDb.js';
import roles from '../../config/roles.json' with { type: 'json' };
import config from '../../config/config.json' with { type: 'json' };

export async function handleStaffApplicationModal(interaction) {
  await interaction.deferReply({ flags: 64 });

  const minecraftUsername = interaction.fields.getTextInputValue('minecraft_username');
  const whyApply = interaction.fields.getTextInputValue('why_apply');
  const experience = interaction.fields.getTextInputValue('experience');
  const availability = interaction.fields.getTextInputValue('availability');
  const additionalInfo = interaction.fields.getTextInputValue('additional_info') || 'N/A';

  const responses = {
    minecraftUsername,
    whyApply,
    experience,
    availability,
    additionalInfo
  };

  const guild = interaction.guild;
  const categoryId = config.STAFF_APPLICATION_CATEGORY_ID;

  if (!categoryId) {
    return interaction.editReply({ content: 'Staff application category ID not configured. Please contact an admin.' });
  }

  const category = await guild.channels.fetch(categoryId).catch(() => null);
  if (!category) {
    return interaction.editReply({ content: 'Staff application category not found. Please contact an admin.' });
  }

  const managerRoles = Array.isArray(roles.MANAGER_ROLE) ? roles.MANAGER_ROLE : [roles.MANAGER_ROLE];
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

  await createStaffApplication(channel.id, interaction.user.id, minecraftUsername, responses);

  const embed = new EmbedBuilder()
    .setTitle(`Staff Application - ${minecraftUsername}`)
    .setColor(0x5865F2)
    .addFields(
      { name: 'Discord User', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Minecraft Username', value: minecraftUsername, inline: true },
      { name: 'Why do you want to apply?', value: whyApply },
      { name: 'Experience', value: experience },
      { name: 'Availability', value: availability },
      { name: 'Additional Information', value: additionalInfo }
    )
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
        .setStyle(ButtonStyle.Danger)
    );

  await channel.send({
    content: 'New staff application submitted!',
    embeds: [embed],
    components: [row]
  });

  await channel.send({
    content: `<@${interaction.user.id}> Thank you for your application! The staff team will review it and get back to you soon.`
  });

  await interaction.editReply({ 
    content: `Your staff application has been submitted successfully! You can view it in <#${channel.id}>.`
  });
}
