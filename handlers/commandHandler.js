import fs from 'fs';
import path from 'path';
import { Collection } from 'discord.js';
import { load, debug, error } from '../utils/logger.js';

export async function loadCommands(client, linkerDb = null, linkerReconciler = null) {
  client.commands = new Collection();
  const commandFolders = fs.readdirSync(path.resolve('./commands'));
  
  for (const folder of commandFolders) {
    const folderPath = path.resolve(`./commands/${folder}`);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = await import(`../commands/${folder}/${file}`);
      if (command.default && command.default.name) {
        client.commands.set(command.default.name, command.default);
        
        if (folder === 'minecraft' && linkerDb && linkerReconciler) {
          if (command.setLinkerDependencies) {
            command.setLinkerDependencies(linkerDb, linkerReconciler);
          } else if (command.default && command.default.setLinkerDependencies) {
            command.default.setLinkerDependencies(linkerDb, linkerReconciler);
          }
        }
      }
    }
  }
  
  load(`Successfully loaded`, 'commands:', client.commands.size);
  return client.commands;
}
