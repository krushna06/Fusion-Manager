import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config/config.json' with { type: 'json' };
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { initDatabase } from './database/mainDb.js';
import { info, error, success } from './utils/logger.js';
import { LinkerDb } from './database/linkerDb.js';
import { LinkerReconciler } from './handlers/linkerReconciler.js';
import { loadConfig } from './utils/linkerConfig.js';

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
    info('Starting bot initialization...');
    await initDatabase();
    
    try {
      info('Initializing linker components...');
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
      
      success('Linker components initialized');
    } catch (linkerErr) {
      error('Error initializing linker components', linkerErr);
      throw linkerErr;
    }
    
    try {
      info('Loading commands...');
      const commands = await loadCommands(client, linkerDb, linkerReconciler);
      success(`Commands loaded successfully`);
    } catch (cmdErr) {
      error('Error loading commands', cmdErr);
      throw cmdErr;
    }
    
    try {
      info('Loading events...');
      await loadEvents(client, linkerReconciler);
      success('Events loaded successfully');
    } catch (evtErr) {
      error('Error loading events', evtErr);
      throw evtErr;
    }
    
    try {
      info('Logging in to Discord...');
      await client.login(config.TOKEN);
      success(`Logged in successfully as ${client.user.tag}`);
    } catch (loginErr) {
      error('Error logging in to Discord', loginErr);
      throw loginErr;
    }
    
    success('Bot initialization completed successfully');
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
        const stats = await linkerReconciler.fullSweep();
        info(`Linker sweep: links=${stats.links} roleAdded=${stats.roleAdded} roleRemoved=${stats.roleRemoved} boosterQueued=${stats.boosterQueued}`);
      } catch (error) {
        error("sweep failed", error);
      }
    }, linkerConfig.sweepMinutes * 60000);
    
    success('Linker background tasks started');
  } catch (error) {
    error('Error in linker ready handler', error);
  }
});

init();
