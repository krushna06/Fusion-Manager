import { getStaffApplicationByUser } from '../../database/mainDb.js';
import { handleStaffApplicationStep1 } from '../modals/staffApplicationStep1.js';

let linkerDb = null;

export function setLinkerDependencies(db) {
  linkerDb = db;
}

export async function handleStaffApplicationButton(interaction) {
  if (!linkerDb) {
    return interaction.reply({ 
      content: 'The linking system is not available. Please try again later.', 
      flags: 64 
    });
  }

  const existingApp = await getStaffApplicationByUser(interaction.user.id);
  if (existingApp) {
    if (existingApp.status === 'pending' || existingApp.status === 'accepted') {
      if (existingApp.channel_id) {
        return interaction.reply({ 
          content: `You already have an active staff application in <#${existingApp.channel_id}>. Please use that channel.`, 
          flags: 64 
        });
      }
    }
    
    if (existingApp.status === 'rejected' && existingApp.rejected_at) {
      const rejectedDate = new Date(existingApp.rejected_at);
      const daysSinceRejection = Math.floor((new Date() - rejectedDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceRejection < 30) {
        const daysRemaining = 30 - daysSinceRejection;
        return interaction.reply({ 
          content: `Your staff application was rejected ${daysSinceRejection} day(s) ago. You must wait ${daysRemaining} more day(s) before applying again.`, 
          flags: 64 
        });
      }
    }
  }

  await handleStaffApplicationStep1(interaction, linkerDb);
}
