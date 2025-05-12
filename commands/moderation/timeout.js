import { PermissionsBitField } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
  name: 'timeout',
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user for a specified duration (in seconds)')
    .addUserOption(option => option.setName('user').setDescription('User to timeout').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in seconds').setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'You do not have permission to timeout members.', ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration') * 1000;
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    try {
      await member.timeout(duration);
      interaction.reply({ content: `${user.tag} has been timed out for ${duration / 1000} seconds.` });
    } catch (err) {
      interaction.reply({ content: `Failed to timeout user: ${err.message}`, ephemeral: true });
    }
  }
};
