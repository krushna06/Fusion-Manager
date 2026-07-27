import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'admin-booster',
  data: new SlashCommandBuilder()
    .setName('admin-booster')
    .setDescription('Manually grant or revoke the in-game booster rank')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option => option
      .setName('action')
      .setDescription('Grant or revoke')
      .setRequired(true)
      .addChoices({ name: "grant", value: "grant" }, { name: "revoke", value: "revoke" }))
    .addUserOption(option => option.setName('member').setDescription('Discord member'))
    .addStringOption(option => option.setName('username').setDescription('Minecraft username')),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const action = interaction.options.getString("action", true);
    const username = interaction.options.getString("username");
    const user = interaction.options.getUser("member");
    
    let uuid = null;
    let label = username ?? "";
    
    if (username) {
      uuid = await db.getUuidByUsername(username);
      if (uuid) label = (await db.getUsernameByUuid(uuid)) ?? username;
    } else if (user) {
      const link = await db.getLinkByDiscord(user.id);
      if (link) {
        uuid = link.uuid;
        label = link.username;
      }
    } else {
      await interaction.editReply({ embeds: [errEmbed("Give a member or a username.")] });
      return;
    }
    
    if (!uuid) {
      await interaction.editReply({ embeds: [errEmbed("Could not resolve that player to a Minecraft account.")] });
      return;
    }
    
    await db.enqueueLpAction(uuid, action === "grant" ? "grant_booster" : "revoke_booster");
    await db.audit(`admin_booster_${action}`, uuid, label, user?.id ?? null, `by ${interaction.user.id}`);
    await reconciler.log(`🛠️ Booster **${action}** queued for **${label}** by <@${interaction.user.id}>`);
    
    await interaction.editReply({
      embeds: [okEmbed(`Queued booster **${action}** for **${label}** — it applies within a few seconds.`)],
    });
  }
};
