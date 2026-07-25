import { SlashCommandBuilder } from 'discord.js';
import { errEmbed, playerInfoEmbed } from '../../utils/linkerEmbeds.js';
import * as linkerDb from '../../database/linkerDb.js';
import { isDonator, topRanksPerRealm } from '../../utils/linkerRanks.js';

export default {
  data: new SlashCommandBuilder()
    .setName('linker-info')
    .setDescription('Show player information')
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('Discord member')
    )
    .addStringOption(option =>
      option
        .setName('username')
        .setDescription('Minecraft username')
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const username = interaction.options.getString('username');
      const user = interaction.options.getUser('member');

      let link = null;
      try {
        if (username) {
          link = await linkerDb.getLinkByUsername(username);
        } else {
          link = await linkerDb.getLinkByDiscord((user ?? interaction.user).id);
        }
      } catch (dbError) {
        console.error('Database error in linker-info:', dbError);
        await interaction.editReply({ 
          embeds: [errEmbed('Failed to query database.')] 
        });
        return;
      }

      if (!link) {
        const message = username
          ? `\`${username}\` hasn't linked a Discord account.`
          : user && user.id !== interaction.user.id
            ? "That member hasn't linked a Minecraft account."
            : "You haven't linked a Minecraft account yet. Run `/discord link` in game.";

        await interaction.editReply({ embeds: [errEmbed(message)] });
        return;
      }

      let member = null;
      try {
        const guild = interaction.guild;
        if (guild) {
          member = await guild.members.fetch(link.discord_id).catch(() => null);
        }
      } catch (memberError) {
        console.error('Error fetching member:', memberError);
      }

      const config = global.config || interaction.client.config || {};
      const linkerConfig = config.linker || {};

      try {
        const groups = await linkerDb.getUserGroups(link.uuid);
        const statsUrl = linkerConfig.statsUrl
          ? linkerConfig.statsUrl.replaceAll('{username}', link.username).replaceAll('{uuid}', link.uuid)
          : '';

        const embed = playerInfoEmbed({
          member,
          discordId: link.discord_id,
          username: link.username,
          linkedAt: Number(link.linked_at),
          donator: isDonator(groups, linkerConfig),
          boosting: member ? member.premiumSince !== null : false,
          ranks: topRanksPerRealm(groups, linkerConfig),
          statsUrl,
          guild: interaction.guild
        });

        await interaction.editReply({ embeds: [embed] });
      } catch (embedError) {
        console.error('Error building embed:', embedError);
        await interaction.editReply({ 
          embeds: [errEmbed('Failed to build player information.')] 
        });
      }
    } catch (error) {
      console.error('linker-info command error:', error);
      try {
        await interaction.editReply({ 
          embeds: [errEmbed('An error occurred while fetching player information.')] 
        });
      } catch {
      }
    }
  }
};
