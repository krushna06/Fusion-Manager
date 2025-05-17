import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { addAdditionalUserToStaffApplication } from '../../database.js';

const MANAGER_ROLE_ID = '878977879822721045';

export default {
  name: 'add-user',
  data: new SlashCommandBuilder()
    .setName('add-user')
    .setDescription('Add a user to this staff application channel')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to add to the staff application channel')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const user = interaction.options.getUser('user');
      const channel = interaction.channel;
      if (!channel.name.startsWith('staff-app-')) {
        return interaction.reply({ content: 'This command can only be used in staff application channels.', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      await channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true
      });
      await addAdditionalUserToStaffApplication(channel.id, user.id);
      await interaction.editReply({ content: `${user.tag} has been added to this staff application channel.` });
    } catch (err) {
      console.error('Error in /add:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'An error occurred while adding the user. Please try again or contact an admin.' });
      } else {
        await interaction.reply({ content: 'An error occurred while adding the user. Please try again or contact an admin.', ephemeral: true });
      }
    }
  }
};
