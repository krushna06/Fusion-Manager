import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { success } from '../utils/logger.js';

const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPromise = open({
  filename: path.join(dataDir, 'database.db'),
  driver: sqlite3.Database
});

async function initDatabase() {
  const db = await dbPromise;
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bug_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      handler_id TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bug_settings (
      guild_id TEXT PRIMARY KEY,
      report_channel_id TEXT
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      handler_id TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS suggestion_settings (
      guild_id TEXT PRIMARY KEY,
      suggestion_channel_id TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS staff_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT UNIQUE,
      staff_id TEXT,
      manager_id TEXT,
      created_at TIMESTAMP NOT NULL,
      additional_users TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      looking_for TEXT NOT NULL,
      offering TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      handler_id TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS trade_settings (
      guild_id TEXT PRIMARY KEY,
      trade_channel_id TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS trade_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trade_id) REFERENCES trades (id) ON DELETE CASCADE,
      UNIQUE(trade_id, user_id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS loa_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      days_requested INTEGER NOT NULL,
      auto_approved INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS loa_settings (
      guild_id TEXT PRIMARY KEY,
      loa_channel_id TEXT,
      manager_role_ids TEXT,
      loa_log_channel_id TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS moderation_proof_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      litebans_id TEXT NOT NULL,
      punishment_type TEXT NOT NULL,
      player_name TEXT NOT NULL,
      player_uuid TEXT,
      staff_name TEXT NOT NULL,
      staff_id TEXT,
      reason TEXT,
      message_id TEXT,
      channel_id TEXT,
      proof_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const loaPragma = await db.all(`PRAGMA table_info(loa_settings)`);
  if (loaPragma.some(col => col.name === 'manager_role_id') && !loaPragma.some(col => col.name === 'manager_role_ids')) {
    await db.exec(`ALTER TABLE loa_settings RENAME COLUMN manager_role_id TO manager_role_ids`);
  }

  if (!loaPragma.some(col => col.name === 'loa_log_channel_id')) {
    await db.exec(`ALTER TABLE loa_settings ADD COLUMN loa_log_channel_id TEXT`);
  }

  const loaRequestsPragma = await db.all(`PRAGMA table_info(loa_requests)`);
  if (!loaRequestsPragma.some(col => col.name === 'auto_approved')) {
    await db.exec(`ALTER TABLE loa_requests ADD COLUMN auto_approved INTEGER DEFAULT 0`);
  }

  const pragma = await db.all(`PRAGMA table_info(staff_applications)`);
  if (!pragma.some(col => col.name === 'additional_users')) {
    await db.exec(`ALTER TABLE staff_applications ADD COLUMN additional_users TEXT`);
  }
  if (!pragma.some(col => col.name === 'minecraft_username')) {
    await db.exec(`ALTER TABLE staff_applications ADD COLUMN minecraft_username TEXT`);
  }
  if (!pragma.some(col => col.name === 'responses')) {
    await db.exec(`ALTER TABLE staff_applications ADD COLUMN responses TEXT`);
  }
  if (!pragma.some(col => col.name === 'status')) {
    await db.exec(`ALTER TABLE staff_applications ADD COLUMN status TEXT DEFAULT 'pending'`);
  }
  if (!pragma.some(col => col.name === 'setup_message_id')) {
    await db.exec(`ALTER TABLE staff_applications ADD COLUMN setup_message_id TEXT`);
  }
  if (!pragma.some(col => col.name === 'setup_channel_id')) {
    await db.exec(`ALTER TABLE staff_applications ADD COLUMN setup_channel_id TEXT`);
  }
  if (!pragma.some(col => col.name === 'rejected_at')) {
    await db.exec(`ALTER TABLE staff_applications ADD COLUMN rejected_at TIMESTAMP`);
  }
  
  const managerIdCol = pragma.find(col => col.name === 'manager_id');
  const channelIdCol = pragma.find(col => col.name === 'channel_id');
  const staffIdCol = pragma.find(col => col.name === 'staff_id');
  if ((managerIdCol && managerIdCol.notnull === 1) || 
      (channelIdCol && channelIdCol.notnull === 1) || 
      (staffIdCol && staffIdCol.notnull === 1)) {
    await db.exec(`
      CREATE TABLE staff_applications_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT UNIQUE,
        staff_id TEXT,
        manager_id TEXT,
        created_at TIMESTAMP NOT NULL,
        additional_users TEXT,
        minecraft_username TEXT,
        responses TEXT,
        status TEXT DEFAULT 'pending',
        setup_message_id TEXT,
        setup_channel_id TEXT,
        rejected_at TIMESTAMP
      )
    `);
    
    await db.exec(`
      INSERT INTO staff_applications_new 
      (id, channel_id, staff_id, manager_id, created_at, additional_users, minecraft_username, responses, status, setup_message_id, setup_channel_id, rejected_at)
      SELECT id, channel_id, staff_id, manager_id, created_at, additional_users, minecraft_username, responses, status, setup_message_id, setup_channel_id, rejected_at
      FROM staff_applications
    `);
    
    await db.exec(`DROP TABLE staff_applications`);
    await db.exec(`ALTER TABLE staff_applications_new RENAME TO staff_applications`);
  }

  success('Database initialized successfully');
}

async function addBugReport(messageId, channelId, userId) {
  const db = await dbPromise;
  
  const result = await db.run(
    `INSERT INTO bug_reports 
     (message_id, channel_id, user_id) 
     VALUES (?, ?, ?)`,
    [messageId, channelId, userId]
  );
  
  return result.lastID;
}

async function updateBugStatus(messageId, status, handlerId, reason = null) {
  const db = await dbPromise;
  
  await db.run(
    `UPDATE bug_reports 
     SET status = ?, handler_id = ?, reason = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE message_id = ?`,
    [status, handlerId, reason, messageId]
  );
  
  return await getBugReportByMessageId(messageId);
}

async function getBugReportByMessageId(messageId) {
  const db = await dbPromise;
  
  return await db.get(
    `SELECT * FROM bug_reports WHERE message_id = ?`,
    [messageId]
  );
}

async function setBugReportChannel(guildId, channelId) {
  const db = await dbPromise;
  
  await db.run(
    `INSERT OR REPLACE INTO bug_settings (guild_id, report_channel_id) VALUES (?, ?)`,
    [guildId, channelId]
  );
}

async function getBugReportChannel(guildId) {
  const db = await dbPromise;
  
  const result = await db.get(
    `SELECT report_channel_id FROM bug_settings WHERE guild_id = ?`,
    [guildId]
  );
  
  return result ? result.report_channel_id : null;
}

async function getBugReportsByStatus(status) {
  const db = await dbPromise;
  
  return await db.all(
    `SELECT * FROM bug_reports WHERE status = ? ORDER BY created_at DESC`,
    [status]
  );
}

async function getUserBugStats(userId) {
  const db = await dbPromise;
  
  const [
    totalReported,
    accepted,
    declined,
    pending
  ] = await Promise.all([
    db.get(`SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ?`, [userId]),
    db.get(`SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'accepted'`, [userId]),
    db.get(`SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'declined'`, [userId]),
    db.get(`SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'pending'`, [userId])
  ]);
  
  return {
    total: totalReported.count,
    accepted: accepted.count,
    declined: declined.count,
    pending: pending.count
  };
}

async function addStaffApplication(channelId, staffId, managerId, createdAt) {
  const db = await dbPromise;
  const result = await db.run(
    `INSERT INTO staff_applications (channel_id, staff_id, manager_id, created_at) VALUES (?, ?, ?, ?)`,
    [channelId, staffId, managerId, createdAt]
  );
  return result.lastID;
}

async function getStaffApplicationByChannel(channelId) {
  const db = await dbPromise;
  return await db.get(
    `SELECT * FROM staff_applications WHERE channel_id = ?`,
    [channelId]
  );
}

async function addAdditionalUserToStaffApplication(channelId, userId) {
  const db = await dbPromise;
  const row = await db.get(
    `SELECT additional_users FROM staff_applications WHERE channel_id = ?`,
    [channelId]
  );
  
  let users = [];
  if (row?.additional_users) {
    try { 
      users = JSON.parse(row.additional_users); 
    } catch { 
      users = []; 
    }
  }
  
  if (!users.includes(userId)) {
    users.push(userId);
  }
  
  await db.run(
    `UPDATE staff_applications SET additional_users = ? WHERE channel_id = ?`,
    [JSON.stringify(users), channelId]
  );
  
  return users;
}

async function removeAdditionalUserFromStaffApplication(channelId, userId) {
  const db = await dbPromise;
  const row = await db.get(
    `SELECT additional_users FROM staff_applications WHERE channel_id = ?`,
    [channelId]
  );
  
  let users = [];
  if (row?.additional_users) {
    try { 
      users = JSON.parse(row.additional_users); 
    } catch { 
      users = []; 
    }
  }
  
  users = users.filter(id => id !== userId);
  
  await db.run(
    `UPDATE staff_applications SET additional_users = ? WHERE channel_id = ?`,
    [JSON.stringify(users), channelId]
  );
  
  return users;
}

async function createStaffApplication(channelId, userId, minecraftUsername, responses) {
  const db = await dbPromise;
  const result = await db.run(
    `INSERT INTO staff_applications (channel_id, staff_id, manager_id, minecraft_username, responses, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [channelId, userId, null, minecraftUsername, JSON.stringify(responses), new Date().toISOString()]
  );
  return result.lastID;
}

async function getStaffApplicationByUser(userId) {
  const db = await dbPromise;
  return await db.get(
    `SELECT * FROM staff_applications WHERE staff_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
}

async function updateStaffApplicationStatus(channelId, status) {
  const db = await dbPromise;
  
  if (status === 'rejected') {
    await db.run(
      `UPDATE staff_applications SET status = ?, rejected_at = ? WHERE channel_id = ?`,
      [status, new Date().toISOString(), channelId]
    );
  } else {
    await db.run(
      `UPDATE staff_applications SET status = ? WHERE channel_id = ?`,
      [status, channelId]
    );
  }
}

async function saveStaffAppSetup(messageId, channelId) {
  const db = await dbPromise;
  
  const existing = await db.get(
    `SELECT * FROM staff_applications WHERE setup_channel_id = ? AND (channel_id IS NULL OR channel_id = 'setup_placeholder')`,
    [channelId]
  );
  
  if (existing) {
    await db.run(
      `UPDATE staff_applications SET setup_message_id = ? WHERE id = ?`,
      [messageId, existing.id]
    );
  } else {
    const dummyChannelId = 'setup_' + Date.now();
    await db.run(
      `INSERT INTO staff_applications (setup_message_id, setup_channel_id, staff_id, manager_id, created_at, channel_id) VALUES (?, ?, NULL, NULL, ?, ?)`,
      [messageId, channelId, new Date().toISOString(), dummyChannelId]
    );
  }
}

async function getStaffAppSetup(channelId) {
  const db = await dbPromise;
  return await db.get(
    `SELECT * FROM staff_applications WHERE setup_channel_id = ? AND channel_id IS NULL`,
    [channelId]
  );
}

async function createLOARequest(userId, guildId, startDate, endDate, reason, daysRequested, autoApproved = 0) {
  const db = await dbPromise;
  const result = await db.run(
    `INSERT INTO loa_requests (user_id, guild_id, start_date, end_date, reason, days_requested, status, auto_approved) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [userId, guildId, startDate, endDate, reason, daysRequested, autoApproved]
  );
  return result.lastID;
}

async function updateLOAStatus(id, status) {
  const db = await dbPromise;
  await db.run(
    `UPDATE loa_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, id]
  );
  return await getLOARequestById(id);
}

async function getLOARequestById(id) {
  const db = await dbPromise;
  return await db.get(
    `SELECT * FROM loa_requests WHERE id = ?`,
    [id]
  );
}

async function getLOARequestsByUser(userId, guildId) {
  const db = await dbPromise;
  return await db.all(
    `SELECT * FROM loa_requests WHERE user_id = ? AND guild_id = ? ORDER BY created_at DESC`,
    [userId, guildId]
  );
}

async function getLOARequestsByStatus(guildId, status) {
  const db = await dbPromise;
  return await db.all(
    `SELECT * FROM loa_requests WHERE guild_id = ? AND status = ? ORDER BY created_at DESC`,
    [guildId, status]
  );
}

async function getUserLOABalance(userId, guildId) {
  const db = await dbPromise;
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  
  const result = await db.get(
    `SELECT COALESCE(SUM(days_requested), 0) as total_days 
     FROM loa_requests 
     WHERE user_id = ? AND guild_id = ? AND status = 'approved' 
     AND start_date >= ?`,
    [userId, guildId, firstDayOfMonth]
  );
  
  return 7 - (result.total_days || 0);
}

async function hasAutoApprovedLOAThisMonth(userId, guildId) {
  const db = await dbPromise;
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  
  const result = await db.get(
    `SELECT COUNT(*) as count 
     FROM loa_requests 
     WHERE user_id = ? AND guild_id = ? AND status = 'approved' 
     AND start_date >= ? AND auto_approved = 1`,
    [userId, guildId, firstDayOfMonth]
  );
  
  return (result.count || 0) > 0;
}

async function setLOAChannel(guildId, channelId, managerRoleIds, logChannelId = null) {
  const db = await dbPromise;
  const managerRoleIdsJson = Array.isArray(managerRoleIds) ? JSON.stringify(managerRoleIds) : managerRoleIds;
  await db.run(
    `INSERT OR REPLACE INTO loa_settings (guild_id, loa_channel_id, manager_role_ids, loa_log_channel_id) VALUES (?, ?, ?, ?)`,
    [guildId, channelId, managerRoleIdsJson, logChannelId]
  );
}

async function getLOASettings(guildId) {
  const db = await dbPromise;
  return await db.get(
    `SELECT * FROM loa_settings WHERE guild_id = ?`,
    [guildId]
  );
}

async function getActiveLOAByUser(userId, guildId) {
  const db = await dbPromise;
  const now = new Date().toISOString().split('T')[0];
  return await db.get(
    `SELECT * FROM loa_requests 
     WHERE user_id = ? AND guild_id = ? AND status = 'approved' 
     AND start_date <= ? AND end_date >= ?`,
    [userId, guildId, now, now]
  );
}

async function getTotalLOAsByUser(userId, guildId) {
  const db = await dbPromise;
  const result = await db.get(
    `SELECT COUNT(*) as total FROM loa_requests 
     WHERE user_id = ? AND guild_id = ? AND status = 'approved'`,
    [userId, guildId]
  );
  return result.total || 0;
}

async function createModerationProofRequest(litebansId, punishmentType, playerName, playerUuid, staffName, staffId, reason, messageId, channelId) {
  const db = await dbPromise;
  const result = await db.run(
    `INSERT INTO moderation_proof_requests 
     (litebans_id, punishment_type, player_name, player_uuid, staff_name, staff_id, reason, message_id, channel_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [litebansId, punishmentType, playerName, playerUuid, staffName, staffId, reason, messageId, channelId]
  );
  return result.lastID;
}

async function getModerationProofRequestByLitebansId(litebansId) {
  const db = await dbPromise;
  return await db.get(
    `SELECT * FROM moderation_proof_requests WHERE litebans_id = ?`,
    [litebansId]
  );
}

async function updateModerationProofRequest(id, proofUrl, status) {
  const db = await dbPromise;
  await db.run(
    `UPDATE moderation_proof_requests 
     SET proof_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [proofUrl, status, id]
  );
  return await db.get(`SELECT * FROM moderation_proof_requests WHERE id = ?`, [id]);
}

async function getModerationProofRequestByMessageId(messageId) {
  const db = await dbPromise;
  return await db.get(
    `SELECT * FROM moderation_proof_requests WHERE message_id = ?`,
    [messageId]
  );
}

export {
  dbPromise,
  initDatabase,
  
  addBugReport,
  updateBugStatus,
  getBugReportByMessageId,
  setBugReportChannel,
  getBugReportChannel,
  getBugReportsByStatus,
  getUserBugStats,
  
  addStaffApplication,
  getStaffApplicationByChannel,
  addAdditionalUserToStaffApplication,
  removeAdditionalUserFromStaffApplication,
  createStaffApplication,
  getStaffApplicationByUser,
  updateStaffApplicationStatus,
  saveStaffAppSetup,
  getStaffAppSetup,
  
  createLOARequest,
  updateLOAStatus,
  getLOARequestById,
  getLOARequestsByUser,
  getLOARequestsByStatus,
  getUserLOABalance,
  hasAutoApprovedLOAThisMonth,
  setLOAChannel,
  getLOASettings,
  getActiveLOAByUser,
  getTotalLOAsByUser,
  
  createModerationProofRequest,
  getModerationProofRequestByLitebansId,
  updateModerationProofRequest,
  getModerationProofRequestByMessageId
};
