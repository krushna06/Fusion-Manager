import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { updateStaffApplicationStatus, getStaffApplicationById } from '../../database/mainDb.js';
import { deleteStaffApplication, deleteStaffApplicationById } from '../../database/models/staffApplication.js';
import config from '../../config.js';

export default {
  name: 'staff-close',
  data: new SlashCommandBuilder()
    .setName('staff-close')
    .setDescription('Close a staff application channel')
    .addIntegerOption(option =>
      option.setName('application_id')
        .setDescription('The ID of the staff application to close (optional)')
        .setRequired(false)
    ),
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

      const applicationId = interaction.options.getInteger('application_id');
      let channel;

      if (applicationId) {
        const application = await getStaffApplicationById(applicationId);
        if (!application) {
          return interaction.editReply({ content: 'Staff application not found with that ID.' });
        }
        
        if (!application.channel_id) {
          try {
            await deleteStaffApplicationById(applicationId);
          } catch (deleteError) {
            console.error('Error deleting staff application with no channel:', deleteError);
          }
          return interaction.editReply({ content: 'This application does not have an associated channel. The application record has been deleted from the database.' });
        }
        
        channel = await interaction.guild.channels.fetch(application.channel_id).catch(() => null);
        if (!channel) {
          try {
            await deleteStaffApplicationById(applicationId);
          } catch (deleteError) {
            console.error('Error deleting corrupted staff application:', deleteError);
          }
          return interaction.editReply({ content: `The channel for this application could not be found. The corrupted application record has been deleted from the database.`, ephemeral: true });
        }
      } else {
        channel = interaction.channel;
        if (!channel.name.startsWith('staff-app-')) {
          return interaction.editReply({ content: 'This command can only be used in staff application channels unless you specify an application ID.', ephemeral: true });
        }
      }
      
      await updateStaffApplicationStatus(channel.id, 'closed');
      
      await interaction.editReply({ content: 'This staff application channel will be closed in 5 seconds.' });
      setTimeout(async () => {
        await channel.delete('Staff application closed by manager');
      }, 5000);
    } catch (err) {
      console.error('Error in /staff-close:', err);
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
