import mysql from 'mysql2/promise';
import config from '../config.js';

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.plan?.mysql?.host || 'standard.fusionpanel.fun',
      port: config.plan?.mysql?.port || 3306,
      user: config.plan?.mysql?.user,
      password: config.plan?.mysql?.password,
      database: config.plan?.mysql?.database || 's17_plan',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

async function getPlayerByUUID(uuid) {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT * FROM plan_users WHERE uuid = ?',
    [uuid]
  );
  return rows[0] || null;
}

async function getPlayerByName(name) {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT * FROM plan_users WHERE name = ?',
    [name]
  );
  return rows[0] || null;
}

async function getPlayerPlaytime(uuid) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT 
      SUM(session_end - session_start) as total_playtime,
      COUNT(*) as session_count,
      MIN(session_start) as first_login,
      MAX(session_end) as last_login
     FROM plan_sessions 
     WHERE user_id = (SELECT id FROM plan_users WHERE uuid = ?)`,
    [uuid]
  );
  return rows[0] || null;
}

async function getPlayerKills(uuid) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT 
      COUNT(*) as total_kills,
      COUNT(DISTINCT victim_uuid) as unique_victims
     FROM plan_kills 
     WHERE killer_uuid = ?`,
    [uuid]
  );
  return rows[0] || null;
}

async function getPlayerDeaths(uuid) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as total_deaths
     FROM plan_kills 
     WHERE victim_uuid = ?`,
    [uuid]
  );
  return rows[0] || null;
}

async function getPlayerVotes(uuid) {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT SUM(votes) as total_votes FROM plan_votes WHERE user_name = (SELECT name FROM plan_users WHERE uuid = ?)',
    [uuid]
  );
  return rows[0] || null;
}

async function getPlayerNicknames(uuid) {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT nickname, last_used FROM plan_nicknames WHERE uuid = ? ORDER BY last_used DESC',
    [uuid]
  );
  return rows || [];
}

async function getPlayerGeolocations(uuid) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT geolocation, last_used 
     FROM plan_geolocations 
     WHERE user_id = (SELECT id FROM plan_users WHERE uuid = ?)
     ORDER BY last_used DESC`,
    [uuid]
  );
  return rows || [];
}

async function getPossibleAlts(uuid) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT DISTINCT u.uuid, u.name, g.geolocation
     FROM plan_geolocations g
     JOIN plan_users u ON g.user_id = u.id
     WHERE g.geolocation IN (
       SELECT geolocation 
       FROM plan_geolocations 
       WHERE user_id = (SELECT id FROM plan_users WHERE uuid = ?)
       AND last_used > UNIX_TIMESTAMP() * 1000 - 2592000000
     )
     AND g.last_used > UNIX_TIMESTAMP() * 1000 - 2592000000
     AND u.uuid != ?
     LIMIT 20`,
    [uuid, uuid]
  );
  return rows || [];
}

async function getPlayerPing(uuid) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT 
      AVG(avg_ping) as avg_ping,
      MAX(max_ping) as max_ping,
      MIN(min_ping) as min_ping
     FROM plan_ping 
     WHERE user_id = (SELECT id FROM plan_users WHERE uuid = ?)`,
    [uuid]
  );
  return rows[0] || null;
}

export {
  getPool,
  getPlayerByUUID,
  getPlayerByName,
  getPlayerPlaytime,
  getPlayerKills,
  getPlayerDeaths,
  getPlayerVotes,
  getPlayerNicknames,
  getPlayerGeolocations,
  getPossibleAlts,
  getPlayerPing
};
