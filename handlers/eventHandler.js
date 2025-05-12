import fs from 'fs';
import path from 'path';
import { load, debug, error } from '../utils/logger.js';

export async function loadEvents(client) {
  const eventFolders = ['client', 'message'];
  let loadedEvents = 0;
  
  for (const folder of eventFolders) {
    const folderPath = path.resolve(`./events/${folder}`);
    if (!fs.existsSync(folderPath)) continue;
    
    const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
      const event = await import(`../events/${folder}/${file}`);
      const eventName = file.split('.')[0];
      
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
  
  load(`Successfully loaded`, 'events:', loadedEvents);
}
