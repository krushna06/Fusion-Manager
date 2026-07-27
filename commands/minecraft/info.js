import { SlashCommandBuilder } from 'discord.js';
import { errEmbed, playerInfoEmbed } from '../../utils/linkerEmbeds.js';
import { isDonator, topRanksPerRealm } from '../../utils/linkerRanks.js';
import { loadConfig } from '../../utils/linkerConfig.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'info',
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Show player information')
    .addUserOption(option => option.setName('member').setDescription('Discord member'))
    .addStringOption(option => option.setName('username').setDescription('Minecraft username')),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    const username = interaction.options.getString("username");
    const user = interaction.options.getUser("member");
    
    let link;
    if (username) {
      link = await db.getLinkByUsername(username);
    } else {
      link = await db.getLinkByDiscord((user ?? interaction.user).id);
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
    
    const config = loadConfig();
    const guild = await reconciler.guild();
    const member = await reconciler.fetchMember(guild, link.discord_id);
    const groups = await db.getUserGroups(link.uuid);
    const statsUrl = config.statsUrl
      ? config.statsUrl.replaceAll("{username}", link.username).replaceAll("{uuid}", link.uuid)
      : "";
    
    const embed = playerInfoEmbed({
      member,
      discordId: link.discord_id,
      username: link.username,
      linkedAt: Number(link.linked_at),
      donator: isDonator(groups, config),
      boosting: member != null && reconciler.isBoosting(member),
      ranks: topRanksPerRealm(groups, config),
      statsUrl,
      guild,
    });
    
    await interaction.editReply({ embeds: [embed] });
  }
};
