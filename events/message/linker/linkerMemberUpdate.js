export default {
  name: 'guildMemberUpdate',

  async execute(oldMember, newMember, client) {
    if (newMember.guild.id !== client.config.linker?.guildId) return;

    if (!client.reconciler) return;

    const linkerConfig = client.config.linker || {};
    
    const premiumChanged = oldMember.partial ||
      (oldMember.premiumSince?.getTime() ?? null) !== (newMember.premiumSince?.getTime() ?? null);

    const roleChanged = oldMember.partial ||
      oldMember.roles.cache.has(linkerConfig.donatorRoleId || '') !== 
      newMember.roles.cache.has(linkerConfig.donatorRoleId || '') ||
      (linkerConfig.boosterRoleId !== '' &&
        oldMember.roles.cache.has(linkerConfig.boosterRoleId) !== 
        newMember.roles.cache.has(linkerConfig.boosterRoleId));

    if (!premiumChanged && !roleChanged) return;

    try {
      await client.reconciler.reconcilePair(null, newMember.id);
    } catch (error) {
      console.error(`member update reconcile failed for ${newMember.id}:`, error);
    }
  }
};
