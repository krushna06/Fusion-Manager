import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUserBugStats } from '../../database/models/user.js';

export default {
  name: 'profile',
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View bug reporting statistics for a user')
    .addUserOption(option => option.setName('user').setDescription('User to view profile for (defaults to yourself)')),
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      const stats = await getUserBugStats(targetUser.id);
      
      const totalProcessed = stats.accepted + stats.declined;
      const acceptanceRate = totalProcessed > 0 
        ? Math.round((stats.accepted / totalProcessed) * 100) 
        : 0;
      
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Bug Report Profile`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setColor(0x3498DB)
        .addFields(
          { name: 'Total Bugs Reported', value: stats.total.toString(), inline: true },
          { name: 'Accepted Bugs', value: stats.accepted.toString(), inline: true },
          { name: 'Declined Bugs', value: stats.declined.toString(), inline: true },
          { name: 'Pending Bugs', value: stats.pending.toString(), inline: true },
          { name: 'Acceptance Rate', value: `${acceptanceRate}%`, inline: true }
        )
        .setFooter({ text: `User ID: ${targetUser.id}` })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      await interaction.reply({ 
        content: 'An error occurred while fetching the user profile.', 
        ephemeral: true 
      });
    }
  }
};
