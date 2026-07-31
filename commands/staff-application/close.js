import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { updateStaffApplicationStatus } from '../../database/mainDb.js';
import config from '../../config.js';

export default {
  name: 'staff-close',
  data: new SlashCommandBuilder()
    .setName('staff-close')
    .setDescription('Close this staff application channel'),
  async execute(interaction) {
    try {
      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply();
        }
      } catch (deferErr) {
        console.error('Error deferring interaction:', deferErr);
      }
      
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
          !interaction.member.roles.cache.has(config.roles.mainServer.staffManagerRole)) {
        return interaction.editReply({ content: 'You do not have permission to use this command.' });
      }
      const channel = interaction.channel;
      if (!channel.name.startsWith('staff-app-')) {
        return interaction.editReply({ content: 'This command can only be used in staff application channels.' });
      }
      
      await updateStaffApplicationStatus(channel.id, 'closed');
      
      await interaction.editReply({ content: 'This staff application channel will be closed in 5 seconds.' });
      setTimeout(async () => {
        await channel.delete('Staff application closed by manager');
      }, 5000);
    } catch (err) {
      console.error('Error in /close:', err);
      if (interaction.deferred || interaction.replied) {
        try {
          await interaction.editReply({ content: 'An error occurred while closing the channel.' });
        } catch (editError) {
          console.error('Error editing error reply:', editError);
        }
      } else {
        try {
          await interaction.reply({ content: 'An error occurred while closing the channel.', flags: 64 });
        } catch (replyError) {
          console.error('Error sending error reply:', replyError);
        }
      }
    }
  }
};
