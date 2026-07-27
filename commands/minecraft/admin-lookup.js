import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';
import { isDonator, topRanksPerRealm } from '../../utils/linkerRanks.js';
import { loadConfig } from '../../utils/linkerConfig.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'admin-lookup',
  data: new SlashCommandBuilder()
    .setName('admin-lookup')
    .setDescription('Review a player\'s link, ranks and history')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option => option.setName('member').setDescription('Discord member'))
    .addStringOption(option => option.setName('username').setDescription('Minecraft username')),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const username = interaction.options.getString("username");
    const user = interaction.options.getUser("member");
    
    let link;
    if (username) {
      link = await db.getLinkByUsername(username);
    } else if (user) {
      link = await db.getLinkByDiscord(user.id);
    } else {
      await interaction.editReply({ embeds: [errEmbed("Give a member or a username.")] });
      return;
    }
    
    if (!link) {
      await interaction.editReply({ embeds: [errEmbed("No link found for that target.")] });
      return;
    }
    
    const config = loadConfig();
    const groups = await db.getUserGroups(link.uuid);
    const history = await db.getRecentAudit(link.discord_id, link.uuid, 10);
    const ranks = topRanksPerRealm(groups, config);
    
    const historyText = history.length > 0
      ? history
        .map((row) => `<t:${Math.floor(Number(row.at) / 1000)}:R> \`${row.side}\` **${row.action}**${row.detail ? ` — ${row.detail}` : ""}`)
        .join("\n")
      : "*No history.*";
    
    const embed = okEmbed([
      `**Link review — \`${link.username}\`**`,
      `Discord: <@${link.discord_id}> (\`${link.discord_id}\`)`,
      `UUID: \`${link.uuid}\``,
      `Linked: <t:${Math.floor(Number(link.linked_at) / 1000)}:F>`,
      `Donator: ${isDonator(groups, config) ? "✅" : "❌"}`,
      `Ranks: ${ranks.length > 0 ? ranks.map((hit) => `${hit.realm.label} ${hit.rank.display}`).join(", ") : "none"}`,
      `Groups: ${groups.length > 0 ? groups.map((group) => `\`${group}\``).join(" ") : "none"}`,
    ].join("\n")).setTitle("Player review").addFields({ name: "Recent history", value: historyText.slice(0, 1024) });
    
    await interaction.editReply({ embeds: [embed] });
  }
};
