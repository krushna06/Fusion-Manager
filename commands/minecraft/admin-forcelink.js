import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'admin-forcelink',
  data: new SlashCommandBuilder()
    .setName('admin-forcelink')
    .setDescription('Manually link a Discord member to a Minecraft account')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option => option.setName('member').setDescription('Discord member').setRequired(true))
    .addStringOption(option => option.setName('username').setDescription('Minecraft username').setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const user = interaction.options.getUser("member", true);
    const username = interaction.options.getString("username", true);
    const uuid = await db.getUuidByUsername(username);
    
    if (!uuid) {
      await interaction.editReply({
        embeds: [errEmbed(`\`${username}\` has never joined the network, so it has no account to link.`)],
      });
      return;
    }
    
    const canonical = (await db.getUsernameByUuid(uuid)) ?? username;
    const result = await db.forceLink(uuid, canonical, user.id, Date.now());
    
    if (!result.ok) {
      const message = result.reason === "uuid_taken"
        ? `\`${canonical}\` is already linked to another Discord account.`
        : `<@${user.id}> is already linked to a Minecraft account.`;
      await interaction.editReply({ embeds: [errEmbed(message)] });
      return;
    }
    
    await db.audit("admin_forcelink", uuid, canonical, user.id, `by ${interaction.user.id}`);
    await db.insertNotification(uuid, "linked");
    await reconciler.reconcilePair(uuid, user.id);
    await reconciler.log(`🛠️ **${canonical}** force-linked to <@${user.id}> by <@${interaction.user.id}>`);
    
    await interaction.editReply({ embeds: [okEmbed(`Linked **${canonical}** to <@${user.id}>.`)] });
  }
};
