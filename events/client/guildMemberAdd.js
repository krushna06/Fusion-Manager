import config from '../../config/config.json' with { type: 'json' };
let reconciler;

export function setLinkerReconciler(linkerReconciler) {
  reconciler = linkerReconciler;
}

export default {
  once: false,
  async execute(client, member) {
    if (!reconciler) return;
    
    const linkerConfig = reconciler.config;
    if (member.guild.id !== linkerConfig.guildId) return;
    
    try {
      await reconciler.reconcilePair(null, member.id);
    } catch (error) {
      console.error(`member add reconcile failed for ${member.id}`, error);
    }
  }
};
