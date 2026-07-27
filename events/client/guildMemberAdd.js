let reconciler;

export function setLinkerReconciler(linkerReconciler) {
  reconciler = linkerReconciler;
}

export default {
  once: false,
  async execute(client, member) {
    if (!reconciler) return;
    
    const config = reconciler.config;
    if (member.guild.id !== config.guildId) return;
    
    try {
      await reconciler.reconcilePair(null, member.id);
    } catch (error) {
      console.error(`member add reconcile failed for ${member.id}`, error);
    }
  }
};
