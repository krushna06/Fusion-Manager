import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { saveStaffAppSetup } from '../../database/mainDb.js';
import roles from '../../config/roles.json' with { type: 'json' };

export default {
  name: 'staffapps-setup',
  data: new SlashCommandBuilder()
    .setName('staffapps-setup')
    .setDescription('Setup the staff application embed with apply button'),
  async execute(interaction) {
    if (!interaction.member.roles.cache.has(roles.STAFF_APPLICATION_MANAGER_ROLE)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
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

    await interaction.deferReply({ flags: 64 });
    
    const message = await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await saveStaffAppSetup(message.id, interaction.channel.id);
    
    await interaction.editReply({ content: 'Staff application embed has been set up successfully!' });
  }
};
