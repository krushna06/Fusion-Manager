import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { initDatabase } from './database/mainDb.js';
import { info, error, success, startupTable } from './utils/logger.js';
import { LinkerDb } from './database/linkerDb.js';
import { LinkerReconciler } from './handlers/linkerReconciler.js';
import { loadConfig } from './utils/linkerConfig.js';
import { initLitebansPoller } from './handlers/litebansPoller.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

let linkerDb = null;
let linkerReconciler = null;
let linkerConfig = null;

async function init() {
  try {
    await initDatabase();
    
    try {
      linkerConfig = loadConfig();
      linkerDb = new LinkerDb(linkerConfig);
      
      for (;;) {
        try {
          await linkerDb.ensureSchema();
          break;
        } catch (error) {
          error('Database not ready, retrying in 5s...', error);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
      
      linkerReconciler = new LinkerReconciler(client, linkerDb, linkerConfig);
    } catch (linkerErr) {
      error('Error initializing linker components', linkerErr);
      throw linkerErr;
    }
    
    try {
      await loadCommands(client, linkerDb, linkerReconciler);
    } catch (cmdErr) {
      error('Error loading commands', cmdErr);
      throw cmdErr;
    }
    
    try {
      await loadEvents(client, linkerReconciler);
    } catch (evtErr) {
      error('Error loading events', evtErr);
      throw evtErr;
    }
    
    try {
      await client.login(config.TOKEN);
    } catch (loginErr) {
      error('Error logging in to Discord', loginErr);
      throw loginErr;
    }
  } catch (err) {
    error('Error during bot initialization', err);
    process.exit(1);
  }
}

client.once('ready', async () => {
  if (!linkerReconciler || !linkerConfig) return;
  
  try {
    const guild = await client.guilds.fetch(linkerConfig.guildId).catch(() => null);
    if (!guild) {
      error(`Linker guild ${linkerConfig.guildId} not found, invite the bot and restart`);
      return;
    }
    
    const role = await guild.roles.fetch(linkerConfig.donatorRoleId).catch(() => null);
    if (!role) {
      error(`Linker donator role ${linkerConfig.donatorRoleId} not found in guild ${guild.name}`);
    } else if (guild.members.me && guild.members.me.roles.highest.comparePositionTo(role) <= 0) {
      error("The bot's highest role must be ABOVE the donator role to manage it");
    }
    
    await linkerReconciler.fullSweep();
    
    initLitebansPoller(client);
    
    setInterval(async () => {
      if (!linkerDb || !linkerReconciler) return;
      
      try {
        const rows = await linkerDb.fetchDirty(50);
        if (rows.length === 0) return;
        
        const seen = new Set();
        for (const row of rows) {
          const key = `${row.uuid ?? ""}|${row.discord_id ?? ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          
          try {
            await linkerReconciler.reconcilePair(row.uuid, row.discord_id);
          } catch (error) {
            error(`reconcile failed for dirty row ${row.id}`, error);
          }
        }
        await linkerDb.deleteDirty(rows.map((row) => row.id));
      } catch (error) {
        error("dirty poll failed", error);
      }
    }, linkerConfig.dirtyPollSeconds * 1000);
    
    setInterval(async () => {
      if (!linkerReconciler) return;
      
      try {
        await linkerReconciler.fullSweep();
      } catch (error) {
        error("sweep failed", error);
      }
    }, linkerConfig.sweepMinutes * 60000);
    
    const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    let linkedUsers = 0;
    
    if (linkerDb) {
      try {
        const allLinks = await linkerDb.getAllLinks();
        linkedUsers = allLinks.length;
      } catch (error) {
        console.error('Error fetching linked users count:', error);
      }
    }
    
    startupTable({
      'Bot Username': client.user.tag,
      'Commands Loaded': client.commands?.size || 0,
      'Servers': client.guilds.cache.size,
      'Total Members': totalMembers,
      'Users Linked': linkedUsers,
      'Status': 'Ready'
    });
  } catch (error) {
    error('Error in linker ready handler', error);
  }
});

init();
