import { dbPromise } from '../connect.js';

export async function createLink(uuid, username, discordId, now) {
  const db = await dbPromise;
  
  await db.run(
    `INSERT INTO linker_links (uuid, username, discord_id, linked_at) 
     VALUES (?, ?, ?, ?)`,
    [uuid, username, discordId, now]
  );
}

export async function getLinkByDiscord(discordId) {
  const db = await dbPromise;
  
  return await db.get(
    `SELECT uuid, username, discord_id, linked_at FROM linker_links WHERE discord_id = ?`,
    [discordId]
  );
}

export async function getLinkByUuid(uuid) {
  const db = await dbPromise;
  
  return await db.get(
    `SELECT uuid, username, discord_id, linked_at FROM linker_links WHERE uuid = ?`,
    [uuid]
  );
}

export async function getLinkByUsername(username) {
  const db = await dbPromise;
  
  return await db.get(
    `SELECT uuid, username, discord_id, linked_at FROM linker_links WHERE LOWER(username) = LOWER(?)`,
    [username]
  );
}

export async function getAllLinks() {
  const db = await dbPromise;
  
  return await db.all(
    `SELECT uuid, username, discord_id, linked_at FROM linker_links`
  );
}

export async function deleteLinkByDiscord(discordId) {
  const db = await dbPromise;
  
  const row = await getLinkByDiscord(discordId);
  if (row) {
    await db.run(
      `DELETE FROM linker_links WHERE discord_id = ?`,
      [discordId]
    );
  }
  
  return row;
}

export async function deleteLinkByUuid(uuid) {
  const db = await dbPromise;
  
  const row = await getLinkByUuid(uuid);
  if (row) {
    await db.run(
      `DELETE FROM linker_links WHERE uuid = ?`,
      [uuid]
    );
  }
  
  return row;
}
