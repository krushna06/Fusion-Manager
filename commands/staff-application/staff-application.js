import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { addStaffApplication } from '../../database.js';

import config from '../../config/config.json' with { type: 'json' };

export default {
  name: 'staff-application',
  data: new SlashCommandBuilder()
    .setName('staff-application')
    .setDescription('Create a private staff application channel for a user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to create staff application for')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.STAFF_MANAGER_ROLE)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const guild = interaction.guild;
    const staffCategory = guild.channels.cache.find(
      c => c.type === 4 && c.name === 'staff-application'
    );
    if (!staffCategory) {
      return interaction.reply({ content: 'Staff-application category not found.', ephemeral: true });
    }
    const channel = await guild.channels.create({
      name: `staff-app-${user.username}`,
      type: 0,
      parent: staffCategory.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: config.MANAGER_ROLE,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });
    await addStaffApplication(
      channel.id,
      user.id,
      interaction.user.id,
      new Date().toISOString()
    );
    await interaction.reply({ content: `Staff application channel created: <#${channel.id}>`, ephemeral: true });
  }
};
