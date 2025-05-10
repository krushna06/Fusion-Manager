import { PermissionsBitField } from 'discord.js';

export default {
  name: 'kick',
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: 'You do not have permission to kick members.', ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    try {
      await member.kick();
      interaction.reply({ content: `${user.tag} has been kicked.` });
    } catch (err) {
      interaction.reply({ content: `Failed to kick user: ${err.message}`, ephemeral: true });
    }
  }
};
