import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config/config.json' with { type: 'json' };
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { initDatabase } from './database/connect.js';
import { initLinkerDb, ensureLinkerSchema, closeLinkerDb } from './database/linkerDb.js';
import { Reconciler } from './utils/linkerReconciler.js';
import { info, error, success } from './utils/logger.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

let dirtyBusy = false;
let sweepBusy = false;

async function runDirty() {
  if (dirtyBusy) return;
  dirtyBusy = true;
  try {
    const rows = await import('./database/linkerDb.js').then(m => m.fetchDirty(50));
    if (rows.length === 0) return;
    
    const seen = new Set();
    for (const row of rows) {
      const key = `${row.uuid ?? ''}|${row.discord_id ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        if (client.reconciler) {
          await client.reconciler.reconcilePair(row.uuid, row.discord_id);
        }
      } catch (error) {
        console.error(`reconcile failed for dirty row ${row.id}`, error);
      }
    }
    await import('./database/linkerDb.js').then(m => m.deleteDirty(rows.map(row => row.id)));
  } catch (error) {
    console.error('dirty poll failed', error);
  } finally {
    dirtyBusy = false;
  }
}

async function runSweep(reason) {
  if (sweepBusy) return;
  sweepBusy = true;
  try {
    if (client.reconciler) {
      const stats = await client.reconciler.fullSweep();
      console.log(`sweep (${reason}): links=${stats.links} roleAdded=${stats.roleAdded} roleRemoved=${stats.roleRemoved} boosterQueued=${stats.boosterQueued}`);
    }
  } catch (error) {
    console.error('sweep failed', error);
  } finally {
    sweepBusy = false;
  }
}

async function init() {
  try {
    info('Starting bot initialization...');
    await initDatabase();
    
    // Initialize linker database if configured
    if (config.linker && config.linker.mysql) {
      try {
        info('Initializing linker database...');
        initLinkerDb(config);
        await ensureLinkerSchema();
        success('Linker database initialized successfully');
      } catch (linkerErr) {
        error('Error initializing linker database', linkerErr);
        // Continue without linker functionality
      }
    }
    
    try {
      info('Loading commands...');
      const commands = await loadCommands(client);
      success(`Commands loaded successfully`);
    } catch (cmdErr) {
      error('Error loading commands', cmdErr);
      throw cmdErr;
    }
    
    try {
      info('Loading events...');
      await loadEvents(client);
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
    
    // Initialize reconciler after login
    if (config.linker && config.linker.mysql && config.linker.guildId) {
      try {
        info('Initializing reconciler...');
        client.reconciler = new Reconciler(client, config);
        client.config = config;
        
        // Start periodic tasks
        const linkerConfig = config.linker;
        const dirtyPollSeconds = linkerConfig.dirtyPollSeconds || 20;
        const sweepMinutes = linkerConfig.sweepMinutes || 10;
        
        setTimeout(() => runSweep('boot'), 5000);
        setInterval(() => runDirty(), dirtyPollSeconds * 1000);
        setInterval(() => runSweep('interval'), sweepMinutes * 60000);
        
        success('Reconciler initialized successfully');
      } catch (reconcilerErr) {
        error('Error initializing reconciler', reconcilerErr);
      }
    }
    
    success('Bot initialization completed successfully');
  } catch (err) {
    error('Error during bot initialization', err);
    process.exit(1);
  }
}

// Handle shutdown gracefully
const shutdown = async () => {
  try {
    await client.destroy();
    await closeLinkerDb();
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown());
process.on('SIGINT', () => shutdown());

init();
