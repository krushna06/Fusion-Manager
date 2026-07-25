import { SlashCommandBuilder } from 'discord.js';
import { createHash } from 'crypto';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';
import * as linkerDb from '../../database/linkerDb.js';

const attempts = new Map();

function tooManyAttempts(userId) {
  const now = Date.now();
  const entry = attempts.get(userId);
  if (!entry || entry.resetAt < now) {
    attempts.set(userId, { count: 1, resetAt: now + 600000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

export default {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Minecraft account to Discord')
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('The code from /discord link in game')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (tooManyAttempts(interaction.user.id)) {
      await interaction.editReply({
        embeds: [errEmbed('Too many attempts, try again in a few minutes.')]
      });
      return;
    }

    const raw = interaction.options.getString('code', true)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (raw.length !== 8) {
      await interaction.editReply({
        embeds: [errEmbed("That code doesn't look right. Get one with `/discord link` in game.")]
      });
      return;
    }

    const hash = createHash('sha256').update(raw).digest('hex');
    const result = await linkerDb.consumeCodeAndLink(hash, interaction.user.id, Date.now());

    if (!result.ok) {
      const message = {
        invalid: 'Invalid code. Get a fresh one with `/discord link` in game.',
        expired: 'That code expired. Get a fresh one with `/discord link` in game.',
        uuid_taken: 'That Minecraft account is already linked to a Discord account.',
        discord_taken: 'Your Discord is already linked to a Minecraft account. Use `/unlink` first.',
        db_not_initialized: 'Linker database not configured.'
      }[result.reason];

      await linkerDb.audit('link_failed', null, null, interaction.user.id, result.reason);
      await interaction.editReply({ embeds: [errEmbed(message)] });
      return;
    }

    await linkerDb.audit('linked', result.uuid, result.username, interaction.user.id, null);
    await linkerDb.insertNotification(result.uuid, 'linked');
    
    if (interaction.client.reconciler) {
      await interaction.client.reconciler.reconcilePair(result.uuid, interaction.user.id);
      await interaction.client.reconciler.log(`🔗 **${result.username}** linked to <@${interaction.user.id}>`);
    }
    
    await interaction.editReply({
      embeds: [okEmbed(`✅ Linked as **${result.username}**. Your perks now sync automatically.`)]
    });
  }
};
