import { SlashCommandBuilder } from 'discord.js';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';
import * as linkerDb from '../../database/linkerDb.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Minecraft account'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const row = await linkerDb.deleteLinkByDiscord(interaction.user.id);

    if (!row) {
      await interaction.editReply({
        embeds: [errEmbed("You don't have a linked account.")]
      });
      return;
    }

    await linkerDb.audit('unlinked', row.uuid, row.username, row.discord_id, 'discord');
    await linkerDb.insertNotification(row.uuid, 'unlinked_remote');
    
    if (interaction.client.reconciler) {
      await interaction.client.reconciler.reconcilePair(row.uuid, row.discord_id);
      await interaction.client.reconciler.log(`⛓️ **${row.username}** unlinked from <@${row.discord_id}>`);
    }
    
    await interaction.editReply({
      embeds: [okEmbed(`Unlinked from **${row.username}**.`)]
    });
  }
};
