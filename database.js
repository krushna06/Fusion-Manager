import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPromise = open({
  filename: path.join(dataDir, 'bugReports.db'),
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
  
  console.log('Database initialized successfully');
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
  
  const totalReported = await db.get(
    `SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ?`,
    [userId]
  );
  
  const accepted = await db.get(
    `SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'accepted'`,
    [userId]
  );
  
  const declined = await db.get(
    `SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'declined'`,
    [userId]
  );
  
  const pending = await db.get(
    `SELECT COUNT(*) as count FROM bug_reports WHERE user_id = ? AND status = 'pending'`,
    [userId]
  );
  
  return {
    total: totalReported.count,
    accepted: accepted.count,
    declined: declined.count,
    pending: pending.count
  };
}

export {
  initDatabase,
  addBugReport,
  updateBugStatus,
  getBugReportByMessageId,
  setBugReportChannel,
  getBugReportChannel,
  getBugReportsByStatus,
  getUserBugStats
};
