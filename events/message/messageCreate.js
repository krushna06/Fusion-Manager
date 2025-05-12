import { addBugReport } from '../../database/models/bug.js';
import { getBugReportChannel } from '../../database/models/guild.js';

export default {
  once: false,
  async execute(client, message) {
    if (message.author.bot) return;
    
    try {
      const reportChannelId = await getBugReportChannel(message.guild.id);
      if (message.channel.id !== reportChannelId) return;
      
      const content = message.content;
      
      const modeMatch = content.match(/\[Mode\]\s+(.*?):/i);
      const bugMatch = content.match(/\[Bug\]\s+(.*?):/i);
      const descMatch = content.match(/\[Bug Description\]\s+(.*?):/i);
      const mediaMatch = content.match(/\[Media\]\s+(.*?):/i);
      
      if (!modeMatch || !bugMatch || !descMatch) {
        try {
          await message.delete();
        } catch (err) {
          console.error('Error deleting invalid bug report:', err);
        }
        
        const reminder = await message.channel.send({
          content: `<@${message.author.id}>`,
          embeds: [{
            title: '❌ Invalid Bug Report Format',
            description: 'Your bug report does not follow the required format. Please use the format below:',
            fields: [{
              name: 'Required Format',
              value: '```\n[Mode] Mode name:\n[Bug] Bug name:\n[Bug Description] Description:\n[Media] Any image or video link:\n```'
            }],
            color: 0xFF0000
          }]
        });
        
        setTimeout(() => {
          reminder.delete().catch(err => console.error('Error deleting reminder message:', err));
        }, 5000);
        
        return;
      }
      
      const extractValue = (match, content, nextFieldIndex) => {
        if (!match) return null;
        
        const startPos = content.indexOf(match[0]) + match[0].length;
        let endPos;
        
        const nextFields = [
          content.indexOf('[Bug]', startPos),
          content.indexOf('[Bug Description]', startPos),
          content.indexOf('[Media]', startPos)
        ].filter(pos => pos > startPos);
        
        if (nextFields.length > 0) {
          endPos = Math.min(...nextFields);
        } else {
          endPos = content.length;
        }
        
        return content.substring(startPos, endPos).trim();
      };
      
      const mode = extractValue(modeMatch, content);
      const bugName = extractValue(bugMatch, content);
      const description = extractValue(descMatch, content);
      const media = mediaMatch ? extractValue(mediaMatch, content) : null;
      
      await addBugReport(
        message.id,
        message.channel.id,
        message.author.id
      );
      
    } catch (error) {
      console.error('Error processing bug report:', error);
    }
  }
};
