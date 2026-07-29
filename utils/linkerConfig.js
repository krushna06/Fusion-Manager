import { readFileSync } from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_REALMS = [
    {
        key: "global",
        label: "GLOBAL",
        emoji: "\u{1F310}",
        ladder: [{ group: "global-fusion", display: "Fusion" }],
    },
    {
        key: "lifesteal",
        label: "LIFESTEAL",
        emoji: "❤️",
        ladder: [
            { group: "ls-soul", display: "Soul" },
            { group: "ls-knight", display: "Knight" },
            { group: "ls-sentinel", display: "Sentinel" },
            { group: "ls-master", display: "Master" },
            { group: "ls-mercenary", display: "Mercenary" },
        ],
    },
    {
        key: "pvp",
        label: "PVP",
        emoji: "⚔️",
        ladder: [
            { group: "pvp-vip", display: "VIP" },
            { group: "pvp-vip+", display: "VIP+" },
            { group: "pvp-elite", display: "Elite" },
            { group: "pvp-mvp+", display: "MVP+" },
        ],
    },
];

export function loadConfig() {
    const mainConfigPath = path.resolve(__dirname, "../config/config.json");
    const rolesConfigPath = path.resolve(__dirname, "../config/roles.json");
    const raw = JSON.parse(readFileSync(mainConfigPath, "utf8"));
    const roles = JSON.parse(readFileSync(rolesConfigPath, "utf8"));
    const linkerConfig = raw.linker ?? {};
    const mysql = linkerConfig.mysql ?? {};
    const config = {
        token: raw.TOKEN ?? "",
        guildId: roles.mainServer.guildId ?? "",
        donatorRoleId: linkerConfig.donatorRoleId ?? "",
        boosterRoleId: linkerConfig.boosterRoleId ?? "",
        logChannelId: linkerConfig.logChannelId ?? "",
        statsUrl: linkerConfig.statsUrl ?? "",
        invite: linkerConfig.invite ?? "",
        mysql: {
            host: mysql.host ?? "standard.fusionpanel.fun",
            port: mysql.port ?? 3306,
            database: mysql.database ?? "s17_luckperms",
            user: mysql.user ?? "",
            password: mysql.password ?? "",
        },
        tablePrefix: linkerConfig.tablePrefix ?? "fd_",
        boosterGroup: linkerConfig.boosterGroup ?? "global-booster",
        realms: Array.isArray(linkerConfig.realms) && linkerConfig.realms.length > 0 ? linkerConfig.realms : DEFAULT_REALMS,
        dirtyPollSeconds: linkerConfig.dirtyPollSeconds ?? 20,
        sweepMinutes: linkerConfig.sweepMinutes ?? 10,
    };
    if (!/^[a-z0-9_]{1,16}$/.test(config.tablePrefix)) {
        throw new Error(`invalid tablePrefix '${config.tablePrefix}'`);
    }
    const missing = [
        !config.token && "token",
        !config.guildId && "guildId (in roles.json mainServer.guildId)",
        !config.donatorRoleId && "donatorRoleId",
        !config.mysql.user && "mysql.user",
    ].filter(Boolean);
    if (missing.length > 0) {
        throw new Error(`config.json/roles.json missing required linker fields: ${missing.join(", ")}`);
    }
    return config;
}

export function donatorGroups(config) {
    return config.realms.flatMap((realm) => realm.ladder.map((rank) => rank.group));
}
