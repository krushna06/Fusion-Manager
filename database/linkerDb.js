import mysql from "mysql2/promise";

export class LinkerDb {
    pool;
    p;
    constructor(config) {
        this.p = config.tablePrefix;
        this.pool = mysql.createPool({
            host: config.mysql.host,
            port: config.mysql.port,
            user: config.mysql.user,
            password: config.mysql.password,
            database: config.mysql.database,
            connectionLimit: 3,
            supportBigNumbers: true,
            bigNumberStrings: false,
        });
    }
    async ensureSchema() {
        const p = this.p;
        const ddl = [
            `CREATE TABLE IF NOT EXISTS ${p}links (
        uuid CHAR(36) NOT NULL,
        username VARCHAR(16) NOT NULL,
        discord_id VARCHAR(20) NOT NULL,
        linked_at BIGINT NOT NULL,
        PRIMARY KEY (uuid),
        UNIQUE KEY uq_${p}links_discord (discord_id),
        KEY idx_${p}links_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS ${p}link_codes (
        uuid CHAR(36) NOT NULL,
        username VARCHAR(16) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        PRIMARY KEY (uuid),
        UNIQUE KEY uq_${p}link_codes_hash (code_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS ${p}dirty (
        id BIGINT NOT NULL AUTO_INCREMENT,
        uuid CHAR(36) NULL,
        discord_id VARCHAR(20) NULL,
        reason VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS ${p}lp_actions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        uuid CHAR(36) NOT NULL,
        action VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS ${p}donator_grants (
        discord_id VARCHAR(20) NOT NULL,
        granted_by VARCHAR(20) NULL,
        granted_at BIGINT NOT NULL,
        PRIMARY KEY (discord_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS ${p}notifications (
        id BIGINT NOT NULL AUTO_INCREMENT,
        uuid CHAR(36) NOT NULL,
        type VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (id),
        KEY idx_${p}notifications_uuid (uuid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS ${p}audit (
        id BIGINT NOT NULL AUTO_INCREMENT,
        at BIGINT NOT NULL,
        side VARCHAR(8) NOT NULL,
        action VARCHAR(32) NOT NULL,
        uuid CHAR(36) NULL,
        username VARCHAR(16) NULL,
        discord_id VARCHAR(20) NULL,
        detail VARCHAR(255) NULL,
        PRIMARY KEY (id),
        KEY idx_${p}audit_at (at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        ];
        for (const statement of ddl) {
            await this.pool.query(statement);
        }
    }
    async getLinkByDiscord(discordId) {
        const [rows] = await this.pool.query(`SELECT uuid, username, discord_id, linked_at FROM ${this.p}links WHERE discord_id = ?`, [discordId]);
        return rows[0] ?? null;
    }
    async getLinkByUuid(uuid) {
        const [rows] = await this.pool.query(`SELECT uuid, username, discord_id, linked_at FROM ${this.p}links WHERE uuid = ?`, [uuid]);
        return rows[0] ?? null;
    }
    async getLinkByUsername(username) {
        const [rows] = await this.pool.query(`SELECT uuid, username, discord_id, linked_at FROM ${this.p}links WHERE LOWER(username) = LOWER(?)`, [username]);
        return rows[0] ?? null;
    }
    async getAllLinks() {
        const [rows] = await this.pool.query(`SELECT uuid, username, discord_id, linked_at FROM ${this.p}links`);
        return rows;
    }
    async consumeCodeAndLink(codeHash, discordId, now) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            const [codeRows] = await conn.query(`SELECT uuid, username, expires_at FROM ${this.p}link_codes WHERE code_hash = ? FOR UPDATE`, [codeHash]);
            const code = codeRows[0];
            if (!code) {
                await conn.rollback();
                return { ok: false, reason: "invalid" };
            }
            if (Number(code.expires_at) < now) {
                await conn.query(`DELETE FROM ${this.p}link_codes WHERE code_hash = ?`, [codeHash]);
                await conn.commit();
                return { ok: false, reason: "expired" };
            }
            const [uuidRows] = await conn.query(`SELECT 1 FROM ${this.p}links WHERE uuid = ? FOR UPDATE`, [code.uuid]);
            if (uuidRows.length > 0) {
                await conn.rollback();
                return { ok: false, reason: "uuid_taken" };
            }
            const [discordRows] = await conn.query(`SELECT 1 FROM ${this.p}links WHERE discord_id = ? FOR UPDATE`, [discordId]);
            if (discordRows.length > 0) {
                await conn.rollback();
                return { ok: false, reason: "discord_taken" };
            }
            await conn.query(`DELETE FROM ${this.p}link_codes WHERE code_hash = ?`, [codeHash]);
            await conn.query(`INSERT INTO ${this.p}links (uuid, username, discord_id, linked_at) VALUES (?, ?, ?, ?)`, [code.uuid, code.username, discordId, now]);
            await conn.commit();
            return { ok: true, uuid: String(code.uuid), username: String(code.username) };
        }
        catch (error) {
            await conn.rollback();
            throw error;
        }
        finally {
            conn.release();
        }
    }
    async deleteLinkWhere(column, value) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            const [rows] = await conn.query(`SELECT uuid, username, discord_id, linked_at FROM ${this.p}links WHERE ${column} = ? FOR UPDATE`, [value]);
            const row = rows[0] ?? null;
            if (row) {
                await conn.query(`DELETE FROM ${this.p}links WHERE uuid = ?`, [row.uuid]);
            }
            await conn.commit();
            return row;
        }
        catch (error) {
            await conn.rollback();
            throw error;
        }
        finally {
            conn.release();
        }
    }
    async deleteLinkByDiscord(discordId) {
        return this.deleteLinkWhere("discord_id", discordId);
    }
    async deleteLinkByUuid(uuid) {
        return this.deleteLinkWhere("uuid", uuid);
    }
    async fetchDirty(limit) {
        const [rows] = await this.pool.query(`SELECT id, uuid, discord_id, reason FROM ${this.p}dirty ORDER BY id ASC LIMIT ?`, [limit]);
        return rows;
    }
    async deleteDirty(ids) {
        if (ids.length === 0)
            return;
        await this.pool.query(`DELETE FROM ${this.p}dirty WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
    }
    async enqueueLpAction(uuid, action) {
        await this.pool.query(`INSERT INTO ${this.p}lp_actions (uuid, action, created_at)
       SELECT ?, ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM ${this.p}lp_actions WHERE uuid = ? AND action = ?)`, [uuid, action, Date.now(), uuid, action]);
    }
    async getUserGroups(uuid) {
        const [rows] = await this.pool.query(`SELECT permission FROM luckperms_user_permissions
       WHERE uuid = ? AND permission LIKE 'group.%' AND value = 1
         AND (expiry IS NULL OR expiry = 0 OR expiry > UNIX_TIMESTAMP())`, [uuid]);
        return rows.map((row) => String(row.permission).slice(6).toLowerCase());
    }
    async getGroupHolderUuids(groups) {
        if (groups.length === 0)
            return new Set();
        const permissions = groups.map((group) => `group.${group.toLowerCase()}`);
        const [rows] = await this.pool.query(`SELECT DISTINCT uuid FROM luckperms_user_permissions
       WHERE permission IN (${permissions.map(() => "?").join(",")}) AND value = 1
         AND (expiry IS NULL OR expiry = 0 OR expiry > UNIX_TIMESTAMP())`, permissions);
        return new Set(rows.map((row) => String(row.uuid)));
    }
    async isDonatorExempt(discordId) {
        const [rows] = await this.pool.query(`SELECT 1 FROM ${this.p}donator_grants WHERE discord_id = ?`, [discordId]);
        return rows.length > 0;
    }
    async addDonatorGrant(discordId, grantedBy) {
        await this.pool.query(`INSERT INTO ${this.p}donator_grants (discord_id, granted_by, granted_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE granted_by = VALUES(granted_by), granted_at = VALUES(granted_at)`, [discordId, grantedBy, Date.now()]);
    }
    async removeDonatorGrant(discordId) {
        const [result] = await this.pool.query(`DELETE FROM ${this.p}donator_grants WHERE discord_id = ?`, [discordId]);
        return result.affectedRows > 0;
    }
    async insertNotification(uuid, type) {
        await this.pool.query(`INSERT INTO ${this.p}notifications (uuid, type, created_at) VALUES (?, ?, ?)`, [
            uuid,
            type,
            Date.now(),
        ]);
    }
    async getUuidByUsername(username) {
        const [rows] = await this.pool.query(`SELECT uuid FROM luckperms_players WHERE LOWER(username) = LOWER(?) LIMIT 1`, [username]);
        return rows[0] ? String(rows[0].uuid) : null;
    }
    async getUsernameByUuid(uuid) {
        const [rows] = await this.pool.query(`SELECT username FROM luckperms_players WHERE uuid = ? LIMIT 1`, [uuid]);
        return rows[0] ? String(rows[0].username) : null;
    }
    async forceLink(uuid, username, discordId, now) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            const [uuidRows] = await conn.query(`SELECT 1 FROM ${this.p}links WHERE uuid = ? FOR UPDATE`, [uuid]);
            if (uuidRows.length > 0) {
                await conn.rollback();
                return { ok: false, reason: "uuid_taken" };
            }
            const [discordRows] = await conn.query(`SELECT 1 FROM ${this.p}links WHERE discord_id = ? FOR UPDATE`, [discordId]);
            if (discordRows.length > 0) {
                await conn.rollback();
                return { ok: false, reason: "discord_taken" };
            }
            await conn.query(`DELETE FROM ${this.p}link_codes WHERE uuid = ?`, [uuid]);
            await conn.query(`INSERT INTO ${this.p}links (uuid, username, discord_id, linked_at) VALUES (?, ?, ?, ?)`, [
                uuid,
                username,
                discordId,
                now,
            ]);
            await conn.commit();
            return { ok: true };
        }
        catch (error) {
            await conn.rollback();
            throw error;
        }
        finally {
            conn.release();
        }
    }
    async getRecentAudit(discordId, uuid, limit) {
        const clauses = [];
        const params = [];
        if (discordId) {
            clauses.push("discord_id = ?");
            params.push(discordId);
        }
        if (uuid) {
            clauses.push("uuid = ?");
            params.push(uuid);
        }
        if (clauses.length === 0)
            return [];
        params.push(limit);
        const [rows] = await this.pool.query(`SELECT at, side, action, username, discord_id, detail FROM ${this.p}audit
       WHERE ${clauses.join(" OR ")} ORDER BY at DESC LIMIT ?`, params);
        return rows;
    }
    async audit(action, uuid, username, discordId, detail) {
        await this.pool.query(`INSERT INTO ${this.p}audit (at, side, action, uuid, username, discord_id, detail) VALUES (?, 'bot', ?, ?, ?, ?, ?)`, [Date.now(), action, uuid, username, discordId, detail]);
    }
    async close() {
        await this.pool.end();
    }
}
