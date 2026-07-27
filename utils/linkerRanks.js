import { donatorGroups } from "./linkerConfig.js";
export function isDonator(groups, config) {
    const donator = new Set(donatorGroups(config).map((group) => group.toLowerCase()));
    return groups.some((group) => donator.has(group.toLowerCase()));
}
export function topRanksPerRealm(groups, config) {
    const owned = new Set(groups.map((group) => group.toLowerCase()));
    const hits = [];
    for (const realm of config.realms) {
        let best = null;
        for (const rank of realm.ladder) {
            if (owned.has(rank.group.toLowerCase()))
                best = rank;
        }
        if (best)
            hits.push({ realm, rank: best });
    }
    return hits;
}
