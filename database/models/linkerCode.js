import { dbPromise } from '../connect.js';

export async function createLinkCode(uuid, username, codeHash, now, expiresAt) {
  const db = await dbPromise;
  
  await db.run(
    `INSERT INTO linker_link_codes (uuid, username, code_hash, created_at, expires_at) 
     VALUES (?, ?, ?, ?, ?)`,
    [uuid, username, codeHash, now, expiresAt]
  );
}

export async function getLinkCodeByHash(codeHash) {
  const db = await dbPromise;
  
  return await db.get(
    `SELECT uuid, username, expires_at FROM linker_link_codes WHERE code_hash = ?`,
    [codeHash]
  );
}

export async function consumeCodeAndLink(codeHash, discordId, now) {
  const db = await dbPromise;
  
  const code = await getLinkCodeByHash(codeHash);
  if (!code) {
    return { ok: false, reason: 'invalid' };
  }
  
  if (Number(code.expires_at) < now) {
    await db.run(
      `DELETE FROM linker_link_codes WHERE code_hash = ?`,
      [codeHash]
    );
    return { ok: false, reason: 'expired' };
  }
  
  const existingUuid = await db.get(
    `SELECT 1 FROM linker_links WHERE uuid = ?`,
    [code.uuid]
  );
  if (existingUuid) {
    return { ok: false, reason: 'uuid_taken' };
  }
  
  const existingDiscord = await db.get(
    `SELECT 1 FROM linker_links WHERE discord_id = ?`,
    [discordId]
  );
  if (existingDiscord) {
    return { ok: false, reason: 'discord_taken' };
  }
  
  await db.run(
    `DELETE FROM linker_link_codes WHERE code_hash = ?`,
    [codeHash]
  );
  
  await db.run(
    `INSERT INTO linker_links (uuid, username, discord_id, linked_at) 
     VALUES (?, ?, ?, ?)`,
    [code.uuid, code.username, discordId, now]
  );
  
  return { ok: true, uuid: String(code.uuid), username: String(code.username) };
}

export async function deleteLinkCodeByUuid(uuid) {
  const db = await dbPromise;
  
  await db.run(
    `DELETE FROM linker_link_codes WHERE uuid = ?`,
    [uuid]
  );
}
