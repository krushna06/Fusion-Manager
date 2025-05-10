import { PermissionsBitField } from 'discord.js';

export default {
  name: 'ban',
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'You do not have permission to ban members.', ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    try {
      await member.ban();
      interaction.reply({ content: `${user.tag} has been banned.` });
    } catch (err) {
      interaction.reply({ content: `Failed to ban user: ${err.message}`, ephemeral: true });
    }
  }
};
