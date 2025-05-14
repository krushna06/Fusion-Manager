import { EmbedBuilder } from 'discord.js';

const suggestionVotes = {};

export async function handleButtonInteraction(interaction) {
  if (!interaction.isButton()) return;
  const { customId, user, message } = interaction;

  if (!customId.startsWith('suggestion_')) return;

  const [, type, msgId] = customId.split('_');
  if (!type || !msgId) return;

  if (!suggestionVotes[msgId]) {
    suggestionVotes[msgId] = {};
  }

  if (type === 'upvote' || type === 'downvote') {
    suggestionVotes[msgId][user.id] = type;
    await interaction.reply({ content: `You voted ${type === 'upvote' ? '<:g_checkmark:1205513702783189072>' : '<:r_cross:1205513709963976784>'}!`, ephemeral: true });
  } else if (type === 'viewvotes') {
    const votes = suggestionVotes[msgId] || {};
    if (Object.keys(votes).length === 0) {
      await interaction.reply({ content: 'No votes yet.', ephemeral: true });
      return;
    }
    const upvoters = Object.entries(votes).filter(([, v]) => v === 'upvote');
    const downvoters = Object.entries(votes).filter(([, v]) => v === 'downvote');
    let result = '';
    if (upvoters.length) {
      result += `<:g_checkmark:1205513702783189072> **Upvotes:**\n` + upvoters.map(([id]) => `<@${id}>`).join('\n') + '\n';
    }
    if (downvoters.length) {
      result += `<:r_cross:1205513709963976784> **Downvotes:**\n` + downvoters.map(([id]) => `<@${id}>`).join('\n');
    }
    await interaction.reply({ content: result, ephemeral: true });
  }
}
