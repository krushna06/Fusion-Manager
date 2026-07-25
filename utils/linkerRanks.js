export function getDonatorGroups(config) {
  const linkerConfig = config.linker || config;
  
  if (!linkerConfig || !linkerConfig.realms) {
    return [];
  }

  return linkerConfig.realms.flatMap(realm => 
    realm.ladder.map(rank => rank.group)
  );
}

export function isDonator(groups, config) {
  const donators = getDonatorGroups(config).map(group => group.toLowerCase());
  return groups.some(group => donators.includes(group.toLowerCase()));
}

export function topRanksPerRealm(groups, config) {
  const linkerConfig = config.linker || config;
  
  if (!linkerConfig || !linkerConfig.realms) {
    return [];
  }

  const owned = new Set(groups.map(group => group.toLowerCase()));
  const hits = [];

  for (const realm of linkerConfig.realms) {
    let best = null;
    for (const rank of realm.ladder) {
      if (owned.has(rank.group.toLowerCase())) {
        best = rank;
      }
    }
    if (best) {
      hits.push({ realm, rank: best });
    }
  }

  return hits;
}
