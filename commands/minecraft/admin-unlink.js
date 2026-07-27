import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'admin-unlink',
  data: new SlashCommandBuilder()
    .setName('admin-unlink')
    .setDescription('Force unlink an account')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option => option.setName('member').setDescription('Discord member'))
    .addStringOption(option => option.setName('username').setDescription('Minecraft username')),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const username = interaction.options.getString("username");
    const user = interaction.options.getUser("member");
    
    if (!username && !user) {
      await interaction.editReply({ embeds: [errEmbed("Give a member or a username.")] });
      return;
    }
    
    let row = null;
    if (username) {
      const existing = await db.getLinkByUsername(username);
      if (existing) row = await db.deleteLinkByUuid(existing.uuid);
    } else if (user) {
      row = await db.deleteLinkByDiscord(user.id);
    }
    
    if (!row) {
      await interaction.editReply({ embeds: [errEmbed("No link found for that target.")] });
      return;
    }
    
    await db.audit("admin_unlink", row.uuid, row.username, row.discord_id, `by ${interaction.user.id}`);
    await db.insertNotification(row.uuid, "unlinked_remote");
    await reconciler.reconcilePair(row.uuid, row.discord_id);
    await reconciler.log(`🛠️ **${row.username}** force-unlinked from <@${row.discord_id}> by <@${interaction.user.id}>`);
    
    await interaction.editReply({ embeds: [okEmbed(`Unlinked **${row.username}** from <@${row.discord_id}>.`)] });
  }
};
