import fs from 'fs';
import path from 'path';
import { load, debug, error } from '../utils/logger.js';

async function loadEventsFromDirectory(client, dirPath, relativePath) {
  let loadedEvents = 0;
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      loadedEvents += await loadEventsFromDirectory(client, itemPath, path.join(relativePath, item));
    } else if (item.endsWith('.js')) {
      const event = await import(`../${relativePath}/${item}`);
      const eventName = item.split('.')[0];
      
      if (event.default && event.default.execute) {
        if (event.default.once) {
          client.once(eventName, (...args) => event.default.execute(client, ...args));
        } else {
          client.on(eventName, (...args) => event.default.execute(client, ...args));
        }
        loadedEvents++;
      }
    }
  }
  
  return loadedEvents;
}

export async function loadEvents(client) {
  const eventFolders = ['client', 'message'];
  const buttonHandlersPath = path.resolve('./handlers/buttons');
  let loadedEvents = 0;
  
  for (const folder of eventFolders) {
    const folderPath = path.resolve(`./events/${folder}`);
    if (!fs.existsSync(folderPath)) continue;
    
    loadedEvents += await loadEventsFromDirectory(client, folderPath, `events/${folder}`);
  }
  
  if (fs.existsSync(buttonHandlersPath)) {
    const buttonHandlerFiles = fs.readdirSync(buttonHandlersPath).filter(file => file.endsWith('.js'));
    
    for (const file of buttonHandlerFiles) {
      try {
        const buttonHandler = await import(`../handlers/buttons/${file}`);
        if (buttonHandler.default && buttonHandler.default.name && buttonHandler.default.execute) {
          client.on(buttonHandler.default.name, buttonHandler.default.execute);
          loadedEvents++;
        }
      } catch (err) {
        error(`Error loading button handler ${file}:`, err);
      }
    }
  }
  
  load(`Successfully loaded`, 'events:', loadedEvents);
}
