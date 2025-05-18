import { SlashCommandBuilder } from 'discord.js';

const config = require('../../config.json');

export default {
  name: 'close',
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close this staff application channel'),
  async execute(interaction) {
    try {
      if (!interaction.member.roles.cache.has(config.STAFF_MANAGER_ROLE)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const channel = interaction.channel;
      if (!channel.name.startsWith('staff-app-')) {
        return interaction.reply({ content: 'This command can only be used in staff application channels.', ephemeral: true });
      }
      await interaction.reply({ content: 'This staff application channel will be closed in 5 seconds.', ephemeral: false });
      setTimeout(async () => {
        await channel.delete('Staff application closed by manager');
      }, 5000);
    } catch (err) {
      console.error('Error in /close:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'An error occurred while closing the channel.' });
      } else {
        await interaction.reply({ content: 'An error occurred while closing the channel.', ephemeral: true });
      }
    }
  }
};
