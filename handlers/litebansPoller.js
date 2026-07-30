import { getPool } from '../database/litebansDb.js';
import { createModerationProofRequest, getModerationProofRequestByLitebansId } from '../database/mainDb.js';
import { getPlayerByUUID } from '../database/planDb.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../config.js';
import { LinkerDb } from '../database/linkerDb.js';

let lastBanId = 0;
let lastMuteId = 0;
let lastKickId = 0;
let lastWarningId = 0;

async function getLatestPunishmentIds() {
  const pool = getPool();
  
  try {
    const [banResult] = await pool.execute('SELECT MAX(id) as max_id FROM litebans_bans');
    const [muteResult] = await pool.execute('SELECT MAX(id) as max_id FROM litebans_mutes');
    const [kickResult] = await pool.execute('SELECT MAX(id) as max_id FROM litebans_kicks');
    const [warningResult] = await pool.execute('SELECT MAX(id) as max_id FROM litebans_warnings');
    
    return {
      ban: banResult[0]?.max_id || 0,
      mute: muteResult[0]?.max_id || 0,
      kick: kickResult[0]?.max_id || 0,
      warning: warningResult[0]?.max_id || 0
    };
  } catch (error) {
    console.error('Error getting latest punishment IDs:', error);
    return { ban: 0, mute: 0, kick: 0, warning: 0 };
  }
}

async function getNewPunishments(type, lastId) {
  const pool = getPool();
  const tableName = `litebans_${type}`;
  
  try {
    let query;
    if (type === 'warnings') {
      query = `SELECT id, uuid, reason, banned_by_name, time, warned 
               FROM ${tableName} 
               WHERE id > ? 
               ORDER BY id ASC`;
    } else {
      query = `SELECT id, uuid, reason, banned_by_name, time, until, active 
               FROM ${tableName} 
               WHERE id > ? 
               ORDER BY id ASC`;
    }
    
    const [rows] = await pool.execute(query, [lastId]);
    return rows || [];
  } catch (error) {
    console.error(`Error getting new ${type}:`, error);
    return [];
  }
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
  
  const existing = await getModerationProofRequestByLitebansId(litebansId);
  if (existing) {
    return;
  }
  
  if (punishment.banned_by_name === 'Console') {
    // console.log(`Ignoring ${type} ${litebansId} - caused by Console (anticheat/system)`);
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
    const linkerDb = new LinkerDb(config.linker);
    const staffLink = await linkerDb.getLinkByUsername(punishment.banned_by_name);
    if (staffLink) {
      staffDiscordId = staffLink.discord_id;
    }
  } catch (error) {
    console.error('Error fetching staff link:', error);
  }
  
  let playerName = punishment.uuid;
  try {
    const player = await getPlayerByUUID(punishment.uuid);
    if (player && player.name) {
      playerName = player.name;
    }
  } catch (error) {
    console.error('Error fetching player from plan database:', error);
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
    
    console.log(`Created proof request for ${type} ${litebansId}`);
  } catch (error) {
    console.error('Error creating proof request:', error);
  }
}

export async function initLitebansPoller(client) {
  console.log('Initializing LiteBans poller...');
  
  const latestIds = await getLatestPunishmentIds();
  lastBanId = latestIds.ban;
  lastMuteId = latestIds.mute;
  lastKickId = latestIds.kick;
  lastWarningId = latestIds.warning;
  
  console.log(`Starting from IDs - Ban: ${lastBanId}, Mute: ${lastMuteId}, Kick: ${lastKickId}, Warning: ${lastWarningId}`);
  
  setInterval(async () => {
    try {
      const latestIds = await getLatestPunishmentIds();
      
      if (latestIds.ban > lastBanId) {
        const newBans = await getNewPunishments('bans', lastBanId);
        for (const ban of newBans) {
          await handleNewPunishment(ban, 'ban', client);
        }
        lastBanId = latestIds.ban;
      }
      
      if (latestIds.mute > lastMuteId) {
        const newMutes = await getNewPunishments('mutes', lastMuteId);
        for (const mute of newMutes) {
          await handleNewPunishment(mute, 'mute', client);
        }
        lastMuteId = latestIds.mute;
      }
      
      if (latestIds.kick > lastKickId) {
        const newKicks = await getNewPunishments('kicks', lastKickId);
        for (const kick of newKicks) {
          await handleNewPunishment(kick, 'kick', client);
        }
        lastKickId = latestIds.kick;
      }
      
      if (latestIds.warning > lastWarningId) {
        const newWarnings = await getNewPunishments('warnings', lastWarningId);
        for (const warning of newWarnings) {
          await handleNewPunishment(warning, 'warning', client);
        }
        lastWarningId = latestIds.warning;
      }
    } catch (error) {
      console.error('Error in LiteBans poller:', error);
    }
  }, 30000);
}

export { getDirectImageUrl };
