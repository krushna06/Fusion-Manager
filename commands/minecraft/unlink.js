import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'unlink',
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Minecraft account'),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const row = await db.deleteLinkByDiscord(interaction.user.id);
    if (!row) {
      await interaction.editReply({ embeds: [errEmbed("You don't have a linked account.")] });
      return;
    }
    
    await db.audit("unlinked", row.uuid, row.username, row.discord_id, "discord");
    await db.insertNotification(row.uuid, "unlinked_remote");
    await reconciler.reconcilePair(row.uuid, row.discord_id);
    await reconciler.log(`⛓️ **${row.username}** unlinked from <@${row.discord_id}>`);
    
    await interaction.editReply({ embeds: [okEmbed(`Unlinked from **${row.username}**.`)] });
  }
};
