import { dbPromise } from '../connect.js';

export async function audit(action, uuid, username, discordId, detail) {
  const db = await dbPromise;
  
  await db.run(
    `INSERT INTO linker_audit (at, side, action, uuid, username, discord_id, detail) 
     VALUES (?, 'bot', ?, ?, ?, ?, ?)`,
    [Date.now(), action, uuid, username, discordId, detail]
  );
}

export async function getRecentAudit(discordId, uuid, limit = 10) {
  const db = await dbPromise;
  
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
  
  return await db.all(
    `SELECT at, side, action, username, discord_id, detail FROM linker_audit
     WHERE ${clauses.join(' OR ')} ORDER BY at DESC LIMIT ?`,
    params
  );
}
