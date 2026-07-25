import * as linkerDb from '../../../database/linkerDb.js';

export default {
  name: 'guildMemberAdd',

  async execute(member, client) {
    if (member.guild.id !== client.config.linker?.guildId) return;

    if (!client.reconciler) return;

    try {
      await client.reconciler.reconcilePair(null, member.id);
    } catch (error) {
      console.error(`member add reconcile failed for ${member.id}:`, error);
    }
  }
};
