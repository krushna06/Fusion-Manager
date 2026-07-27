let reconciler;

export function setLinkerReconciler(linkerReconciler) {
  reconciler = linkerReconciler;
}

export default {
  once: false,
  async execute(client, oldMember, newMember) {
    if (!reconciler) return;
    
    const config = reconciler.config;
    if (newMember.guild.id !== config.guildId) return;
    
    const premiumChanged = oldMember.partial ||
      (oldMember.premiumSince?.getTime() ?? null) !== (newMember.premiumSince?.getTime() ?? null);
    const roleChanged = oldMember.partial ||
      oldMember.roles.cache.has(config.donatorRoleId) !== newMember.roles.cache.has(config.donatorRoleId) ||
      (config.boosterRoleId !== "" &&
        oldMember.roles.cache.has(config.boosterRoleId) !== newMember.roles.cache.has(config.boosterRoleId));
    
    if (!premiumChanged && !roleChanged) return;
    
    try {
      await reconciler.reconcilePair(null, newMember.id);
    } catch (error) {
      console.error(`member update reconcile failed for ${newMember.id}`, error);
    }
  }
};
