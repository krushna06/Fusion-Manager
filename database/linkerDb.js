import mysql from 'mysql2/promise';

let pool = null;
let tablePrefix = 'fd_';

export function initLinkerDb(config) {
  if (config.linker && config.linker.mysql) {
    tablePrefix = config.linker.tablePrefix || 'fd_';
    pool = mysql.createPool({
      host: config.linker.mysql.host,
      port: config.linker.mysql.port,
      user: config.linker.mysql.user,
      password: config.linker.mysql.password,
      database: config.linker.mysql.database,
      connectionLimit: 3,
      supportBigNumbers: true,
      bigNumberStrings: false,
    });
  }
  return pool;
}

export async function ensureLinkerSchema() {
  if (!pool) throw new Error('Linker database not initialized');
  
  const p = tablePrefix;
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
    await pool.query(statement);
  }
}

export async function getLinkByDiscord(discordId) {
  if (!pool) return null;
  const [rows] = await pool.query(`SELECT uuid, username, discord_id, linked_at FROM ${tablePrefix}links WHERE discord_id = ?`, [discordId]);
  return rows[0] ?? null;
}

export async function getLinkByUuid(uuid) {
  if (!pool) return null;
  const [rows] = await pool.query(`SELECT uuid, username, discord_id, linked_at FROM ${tablePrefix}links WHERE uuid = ?`, [uuid]);
  return rows[0] ?? null;
}

export async function getLinkByUsername(username) {
  if (!pool) return null;
  const [rows] = await pool.query(`SELECT uuid, username, discord_id, linked_at FROM ${tablePrefix}links WHERE LOWER(username) = LOWER(?)`, [username]);
  return rows[0] ?? null;
}

export async function getAllLinks() {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT uuid, username, discord_id, linked_at FROM ${tablePrefix}links`);
  return rows;
}

export async function consumeCodeAndLink(codeHash, discordId, now) {
  if (!pool) return { ok: false, reason: 'db_not_initialized' };
  
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [codeRows] = await conn.query(`SELECT uuid, username, expires_at FROM ${tablePrefix}link_codes WHERE code_hash = ? FOR UPDATE`, [codeHash]);
    const code = codeRows[0];
    if (!code) {
      await conn.rollback();
      return { ok: false, reason: 'invalid' };
    }
    if (Number(code.expires_at) < now) {
      await conn.query(`DELETE FROM ${tablePrefix}link_codes WHERE code_hash = ?`, [codeHash]);
      await conn.commit();
      return { ok: false, reason: 'expired' };
    }
    const [uuidRows] = await conn.query(`SELECT 1 FROM ${tablePrefix}links WHERE uuid = ? FOR UPDATE`, [code.uuid]);
    if (uuidRows.length > 0) {
      await conn.rollback();
      return { ok: false, reason: 'uuid_taken' };
    }
    const [discordRows] = await conn.query(`SELECT 1 FROM ${tablePrefix}links WHERE discord_id = ? FOR UPDATE`, [discordId]);
    if (discordRows.length > 0) {
      await conn.rollback();
      return { ok: false, reason: 'discord_taken' };
    }
    await conn.query(`DELETE FROM ${tablePrefix}link_codes WHERE code_hash = ?`, [codeHash]);
    await conn.query(`INSERT INTO ${tablePrefix}links (uuid, username, discord_id, linked_at) VALUES (?, ?, ?, ?)`, [code.uuid, code.username, discordId, now]);
    await conn.commit();
    return { ok: true, uuid: String(code.uuid), username: String(code.username) };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteLinkWhere(column, value) {
  if (!pool) return null;
  
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT uuid, username, discord_id, linked_at FROM ${tablePrefix}links WHERE ${column} = ? FOR UPDATE`, [value]);
    const row = rows[0] ?? null;
    if (row) {
      await conn.query(`DELETE FROM ${tablePrefix}links WHERE uuid = ?`, [row.uuid]);
    }
    await conn.commit();
    return row;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteLinkByDiscord(discordId) {
  return deleteLinkWhere('discord_id', discordId);
}

export async function deleteLinkByUuid(uuid) {
  return deleteLinkWhere('uuid', uuid);
}

export async function fetchDirty(limit) {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT id, uuid, discord_id, reason FROM ${tablePrefix}dirty ORDER BY id ASC LIMIT ?`, [limit]);
  return rows;
}

export async function deleteDirty(ids) {
  if (!pool || ids.length === 0) return;
  await pool.query(`DELETE FROM ${tablePrefix}dirty WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
}

export async function enqueueLpAction(uuid, action) {
  if (!pool) return;
  await pool.query(`INSERT INTO ${tablePrefix}lp_actions (uuid, action, created_at)
     SELECT ?, ?, ? FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM ${tablePrefix}lp_actions WHERE uuid = ? AND action = ?)`, [uuid, action, Date.now(), uuid, action]);
}

export async function getUserGroups(uuid) {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT permission FROM luckperms_user_permissions
     WHERE uuid = ? AND permission LIKE 'group.%' AND value = 1
       AND (expiry IS NULL OR expiry = 0 OR expiry > UNIX_TIMESTAMP())`, [uuid]);
  return rows.map((row) => String(row.permission).slice(6).toLowerCase());
}

export async function getGroupHolderUuids(groups) {
  if (!pool || groups.length === 0) return new Set();
  const permissions = groups.map((group) => `group.${group.toLowerCase()}`);
  const [rows] = await pool.query(`SELECT DISTINCT uuid FROM luckperms_user_permissions
     WHERE permission IN (${permissions.map(() => '?').join(',')}) AND value = 1
       AND (expiry IS NULL OR expiry = 0 OR expiry > UNIX_TIMESTAMP())`, permissions);
  return new Set(rows.map((row) => String(row.uuid)));
}

export async function isDonatorExempt(discordId) {
  if (!pool) return false;
  const [rows] = await pool.query(`SELECT 1 FROM ${tablePrefix}donator_grants WHERE discord_id = ?`, [discordId]);
  return rows.length > 0;
}

export async function addDonatorGrant(discordId, grantedBy) {
  if (!pool) return;
  await pool.query(`INSERT INTO ${tablePrefix}donator_grants (discord_id, granted_by, granted_at) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE granted_by = VALUES(granted_by), granted_at = VALUES(granted_at)`, [discordId, grantedBy, Date.now()]);
}

export async function removeDonatorGrant(discordId) {
  if (!pool) return false;
  const [result] = await pool.query(`DELETE FROM ${tablePrefix}donator_grants WHERE discord_id = ?`, [discordId]);
  return result.affectedRows > 0;
}

export async function insertNotification(uuid, type) {
  if (!pool) return;
  await pool.query(`INSERT INTO ${tablePrefix}notifications (uuid, type, created_at) VALUES (?, ?, ?)`, [
    uuid,
    type,
    Date.now(),
  ]);
}

export async function getUuidByUsername(username) {
  if (!pool) return null;
  const [rows] = await pool.query(`SELECT uuid FROM luckperms_players WHERE LOWER(username) = LOWER(?) LIMIT 1`, [username]);
  return rows[0] ? String(rows[0].uuid) : null;
}

export async function getUsernameByUuid(uuid) {
  if (!pool) return null;
  const [rows] = await pool.query(`SELECT username FROM luckperms_players WHERE uuid = ? LIMIT 1`, [uuid]);
  return rows[0] ? String(rows[0].username) : null;
}

export async function forceLink(uuid, username, discordId, now) {
  if (!pool) return { ok: false, reason: 'db_not_initialized' };
  
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [uuidRows] = await conn.query(`SELECT 1 FROM ${tablePrefix}links WHERE uuid = ? FOR UPDATE`, [uuid]);
    if (uuidRows.length > 0) {
      await conn.rollback();
      return { ok: false, reason: 'uuid_taken' };
    }
    const [discordRows] = await conn.query(`SELECT 1 FROM ${tablePrefix}links WHERE discord_id = ? FOR UPDATE`, [discordId]);
    if (discordRows.length > 0) {
      await conn.rollback();
      return { ok: false, reason: 'discord_taken' };
    }
    await conn.query(`DELETE FROM ${tablePrefix}link_codes WHERE uuid = ?`, [uuid]);
    await conn.query(`INSERT INTO ${tablePrefix}links (uuid, username, discord_id, linked_at) VALUES (?, ?, ?, ?)`, [
      uuid,
      username,
      discordId,
      now,
    ]);
    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function getRecentAudit(discordId, uuid, limit = 10) {
  if (!pool) return [];
  const clauses = [];
  const params = [];
  if (discordId) {
    clauses.push('discord_id = ?');
    params.push(discordId);
  }
  if (uuid) {
    clauses.push('uuid = ?');
    params.push(uuid);
  }
  if (clauses.length === 0) return [];
  params.push(limit);
  const [rows] = await pool.query(`SELECT at, side, action, username, discord_id, detail FROM ${tablePrefix}audit
     WHERE ${clauses.join(' OR ')} ORDER BY at DESC LIMIT ?`, params);
  return rows;
}

export async function audit(action, uuid, username, discordId, detail) {
  if (!pool) return;
  await pool.query(`INSERT INTO ${tablePrefix}audit (at, side, action, uuid, username, discord_id, detail) VALUES (?, 'bot', ?, ?, ?, ?, ?)`, [Date.now(), action, uuid, username, discordId, detail]);
}

export async function closeLinkerDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
