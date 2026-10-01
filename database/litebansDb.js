import mysql from 'mysql2/promise';
import config from '../config.js';
import { withRetry } from './mysqlUtil.js';

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.litebans?.mysql?.host || 'standard.fusionpanel.fun',
      port: config.litebans?.mysql?.port || 3306,
      user: config.litebans?.mysql?.user,
      password: config.litebans?.mysql?.password,
      database: config.litebans?.mysql?.database || 's17_litebans',
      waitForConnections: true,
      connectionLimit: 2,
      queueLimit: 0,
      maxIdle: 1,
      idleTimeout: 30000,
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });
  }
  return pool;
}

async function query(sql, params) {
  const p = getPool();
  return withRetry(() => p.execute(sql, params));
}

async function getPlayerBans(uuid) {
  const [rows] = await query(
    `SELECT 
      id, reason, banned_by_name, time, until, active, removed_by_name, removed_by_date
     FROM litebans_bans 
     WHERE uuid = ? 
     ORDER BY time DESC 
     LIMIT 10`,
    [uuid]
  );
  return rows || [];
}

async function getPlayerMutes(uuid) {
  const [rows] = await query(
    `SELECT 
      id, reason, banned_by_name, time, until, active, removed_by_name, removed_by_date
     FROM litebans_mutes 
     WHERE uuid = ? 
     ORDER BY time DESC 
     LIMIT 10`,
    [uuid]
  );
  return rows || [];
}

async function getPlayerKicks(uuid) {
  const [rows] = await query(
    `SELECT 
      id, reason, banned_by_name, time 
     FROM litebans_kicks 
     WHERE uuid = ? 
     ORDER BY time DESC 
     LIMIT 10`,
    [uuid]
  );
  return rows || [];
}

async function getPlayerWarnings(uuid) {
  const [rows] = await query(
    `SELECT 
      id, reason, banned_by_name, time, warned 
     FROM litebans_warnings 
     WHERE uuid = ? 
     ORDER BY time DESC 
     LIMIT 10`,
    [uuid]
  );
  return rows || [];
}

async function getPlayerHistory(uuid) {
  const [rows] = await query(
    `SELECT name, ip, date 
     FROM litebans_history 
     WHERE uuid = ? 
     ORDER BY date DESC 
     LIMIT 20`,
    [uuid]
  );
  return rows || [];
}

async function getActiveBan(uuid) {
  const [rows] = await query(
    `SELECT * FROM litebans_bans 
     WHERE uuid = ? AND active = 1 
     AND (until = 0 OR until > UNIX_TIMESTAMP() * 1000)`,
    [uuid]
  );
  return rows[0] || null;
}

async function getActiveMute(uuid) {
  const [rows] = await query(
    `SELECT * FROM litebans_mutes 
     WHERE uuid = ? AND active = 1 
     AND (until = 0 OR until > UNIX_TIMESTAMP() * 1000)`,
    [uuid]
  );
  return rows[0] || null;
}

export {
  getPool,
  query,
  getPlayerBans,
  getPlayerMutes,
  getPlayerKicks,
  getPlayerWarnings,
  getPlayerHistory,
  getActiveBan,
  getActiveMute
};
