import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'admin-resync',
  data: new SlashCommandBuilder()
    .setName('admin-resync')
    .setDescription('Re-run the sync for one player')
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
    
    await reconciler.reconcilePair(link.uuid, link.discord_id);
    await db.audit("admin_resync", link.uuid, link.username, link.discord_id, `by ${interaction.user.id}`);
    
    await interaction.editReply({ embeds: [okEmbed(`Re-synced **${link.username}**.`)] });
  }
};
