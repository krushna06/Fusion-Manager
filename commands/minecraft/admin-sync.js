import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { okEmbed } from '../../utils/linkerEmbeds.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'admin-sync',
  data: new SlashCommandBuilder()
    .setName('admin-sync')
    .setDescription('Run a full sync sweep now')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const stats = await reconciler.fullSweep();
    await interaction.editReply({
      embeds: [
        okEmbed(`Sweep finished: **${stats.links}** links checked, **${stats.roleAdded}** roles added, **${stats.roleRemoved}** roles removed, **${stats.boosterQueued}** booster actions queued.`),
      ],
    });
  }
};
