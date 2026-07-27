import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createHash } from 'node:crypto';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';
import { loadConfig } from '../../utils/linkerConfig.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'link',
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Minecraft account to Discord')
    .addStringOption(option => 
      option.setName('code')
        .setDescription('The code from /discord link in game')
        .setRequired(true)),
  
  attempts: new Map(),
  
  tooManyAttempts(userId) {
    const now = Date.now();
    const entry = this.attempts.get(userId);
    if (!entry || entry.resetAt < now) {
      this.attempts.set(userId, { count: 1, resetAt: now + 600000 });
      return false;
    }
    entry.count += 1;
    return entry.count > 5;
  },
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    if (this.tooManyAttempts(interaction.user.id)) {
      await interaction.editReply({ embeds: [errEmbed("Too many attempts, try again in a few minutes.")] });
      return;
    }
    
    const raw = interaction.options.getString("code", true).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (raw.length !== 8) {
      await interaction.editReply({
        embeds: [errEmbed("That code doesn't look right. Get one with `/discord link` in game.")],
      });
      return;
    }
    
    const hash = createHash("sha256").update(raw).digest("hex");
    const result = await db.consumeCodeAndLink(hash, interaction.user.id, Date.now());
    
    if (!result.ok) {
      const message = {
        invalid: "Invalid code. Get a fresh one with `/discord link` in game.",
        expired: "That code expired. Get a fresh one with `/discord link` in game.",
        uuid_taken: "That Minecraft account is already linked to a Discord account.",
        discord_taken: "Your Discord is already linked to a Minecraft account. Use `/unlink` first.",
      }[result.reason];
      
      await db.audit("link_failed", null, null, interaction.user.id, result.reason);
      await interaction.editReply({ embeds: [errEmbed(message)] });
      return;
    }
    
    await db.audit("linked", result.uuid, result.username, interaction.user.id, null);
    await db.insertNotification(result.uuid, "linked");
    await reconciler.reconcilePair(result.uuid, interaction.user.id);
    await reconciler.log(`🔗 **${result.username}** linked to <@${interaction.user.id}>`);
    
    await interaction.editReply({
      embeds: [okEmbed(`✅ Linked as **${result.username}**. Your perks now sync automatically.`)],
    });
  }
};
