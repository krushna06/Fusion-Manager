import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import { saveStaffAppSetup } from '../../database/mainDb.js';
import config from '../../config.js';

export default {
  name: 'setup-staffapps',
  data: new SlashCommandBuilder()
    .setName('setup-staffapps')
    .setDescription('Setup the staff application embed with apply button'),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    let hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    
    if (!hasPermission && config.roles.mainServer.staffManagerRole && config.channels.mainServer.guildId) {
      try {
        const mainGuild = await interaction.client.guilds.fetch(config.channels.mainServer.guildId).catch(() => null);
        if (mainGuild) {
          const mainMember = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
          if (mainMember && mainMember.roles.cache.has(config.roles.mainServer.staffManagerRole)) {
            hasPermission = true;
          }
        }
      } catch (err) {
        console.error('Error checking staff manager role in main server:', err);
      }
    }
    
    if (!hasPermission) {
      return interaction.editReply({ content: 'You do not have permission to use this command.' });
    }

    const embed = new EmbedBuilder()
      .setTitle('Apply for Staff')
      .setDescription('Think you have what it takes to help run Fusion? This is where it starts.\n\nPress the button below and a private channel opens just for you: what the role actually involves, a short guide on writing a strong application, then the application itself. All in your own words, no shortcuts.\n\nYou need your Minecraft account linked to Discord to apply. Not linked yet? Run /link in game first.')
      .setColor(0x5865F2);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('staff_apply_button')
          .setLabel('Apply')
          .setStyle(ButtonStyle.Primary)
      );
    
    const message = await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await saveStaffAppSetup(message.id, interaction.channel.id);
    
    await interaction.editReply({ content: 'Staff application embed has been set up successfully!' });
  }
};
