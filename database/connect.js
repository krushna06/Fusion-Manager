import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { success, info, error, debug } from '../utils/logger.js';

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
      channel_id TEXT NOT NULL UNIQUE,
      staff_id TEXT NOT NULL,
      manager_id TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      additional_users TEXT
    )
  `);

  const pragma = await db.all(`PRAGMA table_info(staff_applications)`);
  if (!pragma.some(col => col.name === 'additional_users')) {
    await db.exec(`ALTER TABLE staff_applications ADD COLUMN additional_users TEXT`);
  }

  success('Database initialized successfully');
}

export {
  dbPromise,
  initDatabase
};
