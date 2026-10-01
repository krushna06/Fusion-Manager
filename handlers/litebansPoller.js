import { query } from '../database/litebansDb.js';
import {
  createModerationProofRequest,
  getModerationProofRequestByLitebansId,
  getBotState,
  setBotState
} from '../database/mainDb.js';
import { getPlayerByUUID } from '../database/planDb.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../config.js';
import { getSharedLinkerDb } from '../database/linkerDb.js';

const POLL_INTERVAL = 30000;
const PUNISHMENT_TYPES = ['bans', 'mutes', 'kicks', 'warnings'];
const STATE_PREFIX = 'litebans_last_id_';

const MAX_PER_POLL = 25;

const RUNTIME_START = Date.now();

const lastIds = {
  bans: 0,
  mutes: 0,
  kicks: 0,
  warnings: 0
};

const TABLES = {
  bans: 'litebans_bans',
  mutes: 'litebans_mutes',
  kicks: 'litebans_kicks',
  warnings: 'litebans_warnings'
};

const seeded = {
  bans: false,
  mutes: false,
  kicks: false,
  warnings: false
};

function shortType(type) {
  return type.replace(/s$/, '');
}

async function loadLastIds() {
  for (const type of PUNISHMENT_TYPES) {
    const stored = await getBotState(`${STATE_PREFIX}${type}`);
    if (stored === null || stored === undefined) {
      lastIds[type] = 0;
      seeded[type] = false;
    } else {
      lastIds[type] = Number(stored) || 0;
      seeded[type] = true;
    }
  }
  return lastIds;
}

async function saveLastIds() {
  for (const type of PUNISHMENT_TYPES) {
    await setBotState(`${STATE_PREFIX}${type}`, lastIds[type]);
  }
}

async function getLatestPunishmentIds() {
  try {
    const result = {};
    for (const type of PUNISHMENT_TYPES) {
      const [rows] = await query(
        `SELECT MAX(id) as max_id FROM ${TABLES[type]} WHERE time >= ?`,
        [RUNTIME_START]
      );
      result[type] = Number(rows[0]?.max_id) || 0;
    }
    return result;
  } catch (error) {
    console.error('Error getting latest punishment IDs:', error.message);
    return null;
  }
}

async function getNewPunishments(type, lastId, limit = MAX_PER_POLL) {
  const columns = type === 'warnings'
    ? 'id, uuid, reason, banned_by_name, time, warned'
    : 'id, uuid, reason, banned_by_name, time, until, active';

  const [rows] = await query(
    `SELECT ${columns} FROM ${TABLES[type]}
     WHERE id > ? AND time >= ?
     ORDER BY id ASC LIMIT ?`,
    [lastId, RUNTIME_START, limit]
  );
  return rows || [];
}

async function getDirectImageUrl(url) {
  if (url.includes('i.postimg.cc')) {
    return url;
  }
  
  if (url.includes('postimg.cc')) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      
      const directUrlMatch = text.match(/https:\/\/i\.postimg\.cc\/[^"'\s]+/);
      if (directUrlMatch) {
        return directUrlMatch[0];
      }
    } catch (error) {
      console.error('Error fetching postimg.cc page:', error);
    }
  }
  
  return url;
}

async function createProofEmbed(punishment, type, staffDiscordId, playerName) {
  const staffName = punishment.banned_by_name || 'Unknown Staff';
  const reason = punishment.reason || 'No reason provided';
  const litebansId = `${type}_${punishment.id}`;
  
  const typeEmoji = {
    ban: '🔨',
    mute: '🔇',
    kick: '👢',
    warning: '⚠️'
  };
  
  const embed = new EmbedBuilder()
    .setTitle(`${typeEmoji[type]} Proof Required: ${type.charAt(0).toUpperCase() + type.slice(1)}`)
    .setColor(0xFFA500)
    .addFields(
      { name: 'Staff Member', value: staffDiscordId ? `<@${staffDiscordId}>` : staffName, inline: true },
      { name: 'Player', value: `${playerName}\n(${punishment.uuid})`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: litebansId });
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`attach_proof_${litebansId}`)
        .setLabel('Attach Proof')
        .setStyle(ButtonStyle.Primary)
    );
  
  return { embed, components: [row] };
}

async function handleNewPunishment(punishment, type, client) {
  const litebansId = `${type}_${punishment.id}`;

  if (punishment.banned_by_name === 'Console') {
    return;
  }

  const existing = await getModerationProofRequestByLitebansId(litebansId);
  if (existing) {
    return;
  }

  if (!config.channels.staffServer?.playerReportsChannelId) {
    console.error('Player reports channel ID not configured');
    return;
  }

  const channel = await client.channels.fetch(config.channels.staffServer.playerReportsChannelId).catch(() => null);
  if (!channel) {
    console.error('Player reports channel not found');
    return;
  }

  let staffDiscordId = null;
  try {
    const staffLink = await getSharedLinkerDb().getLinkByUsername(punishment.banned_by_name);
    if (staffLink) {
      staffDiscordId = staffLink.discord_id;
    }
  } catch (error) {
    console.error(`Could not resolve staff link for ${litebansId}:`, error.message);
  }

  let playerName = punishment.uuid;
  try {
    const player = await getPlayerByUUID(punishment.uuid);
    if (player && player.name) {
      playerName = player.name;
    }
  } catch (error) {
    console.error(`Could not resolve player name for ${litebansId}:`, error.message);
  }

  const { embed, components } = await createProofEmbed(punishment, type, staffDiscordId, playerName);

  const staffMention = staffDiscordId ? `<@${staffDiscordId}>` : punishment.banned_by_name;

  try {
    const message = await channel.send({
      content: `${staffMention} Provide proof for ${type} on ${playerName}.`,
      embeds: [embed],
      components
    });

    await createModerationProofRequest(
      litebansId,
      type,
      playerName,
      punishment.uuid,
      punishment.banned_by_name,
      staffDiscordId,
      punishment.reason,
      message.id,
      channel.id
    );
  } catch (error) {
    console.error('Error creating proof request:', error);
  }
}

async function pollOnce(client) {
  const latest = await getLatestPunishmentIds();

  if (!latest) {
    return;
  }

  let announced = 0;
  let activatedAny = false;

  for (const type of PUNISHMENT_TYPES) {
    if (!seeded[type]) {
      lastIds[type] = 0;
      seeded[type] = true;
      activatedAny = true;
    }

    if (seeded[type] && latest[type] <= lastIds[type]) {
      continue;
    }

    let rows;
    try {
      rows = await getNewPunishments(type, lastIds[type]);
    } catch (error) {
      console.error(`Error fetching new ${type}:`, error.message);
      continue;
    }

    for (const punishment of rows) {
      await handleNewPunishment(punishment, shortType(type), client);
      lastIds[type] = punishment.id;
      announced++;
    }

    if (rows.length === 0) {
      lastIds[type] = latest[type];
    }
  }

  if (announced > 0 || activatedAny) {
    await saveLastIds().catch(error =>
      console.error('Error saving LiteBans poller state:', error.message)
    );
  }
}

export async function initLitebansPoller(client) {
  await loadLastIds().catch(error =>
    console.error('Error loading LiteBans poller state:', error.message)
  );

  setInterval(async () => {
    try {
      await pollOnce(client);
    } catch (error) {
      console.error('Error in LiteBans poller:', error);
    }
  }, POLL_INTERVAL);
}

export { getDirectImageUrl };
