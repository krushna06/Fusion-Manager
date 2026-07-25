import { dbPromise } from '../connect.js';

export async function addDonatorGrant(discordId, grantedBy) {
  const db = await dbPromise;
  
  await db.run(
    `INSERT OR REPLACE INTO linker_donator_grants (discord_id, granted_by, granted_at) 
     VALUES (?, ?, ?)`,
    [discordId, grantedBy, Date.now()]
  );
}

export async function removeDonatorGrant(discordId) {
  const db = await dbPromise;
  
  const result = await db.run(
    `DELETE FROM linker_donator_grants WHERE discord_id = ?`,
    [discordId]
  );
  
  return result.changes > 0;
}

export async function isDonatorExempt(discordId) {
  const db = await dbPromise;
  
  const row = await db.get(
    `SELECT 1 FROM linker_donator_grants WHERE discord_id = ?`,
    [discordId]
  );
  
  return !!row;
}
