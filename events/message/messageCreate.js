import { addBugReport } from '../../database/models/bug.js';
import { addSuggestion } from '../../database/models/suggestion.js';
import { getBugReportChannel, getSuggestionChannel } from '../../database/models/guild.js';
import { EmbedBuilder } from 'discord.js';
import { success, error, info } from '../../utils/logger.js';

export default {
  once: false,
  async execute(client, message) {
    if (message.author.bot) return;
    
    try {
      const reportChannelId = await getBugReportChannel(message.guild.id);
      
      const suggestionChannelId = await getSuggestionChannel(message.guild.id);
      
      if (message.channel.id === reportChannelId) {
        await handleBugReport(message);
      }
      else if (message.channel.id === suggestionChannelId) {
        await handleSuggestion(message);
      }
      else {
        return;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }
};

/**
 * handle a bug report message
 * @param {Message} message
 */
async function handleBugReport(message) {
  try {
      
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

      await message.delete().catch(err => {
        console.error('Error deleting original bug report message:', err);
      });

      const bugEmbed = new EmbedBuilder()
        .setTitle('🐞 New Bug Report')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Mode', value: mode || 'N/A', inline: true },
          { name: 'Bug', value: bugName || 'N/A', inline: true },
          { name: 'Reported by', value: `<@${message.author.id}>`, inline: true },
          { name: 'Description', value: description || 'N/A', inline: false }
        )
        .setFooter({ text: `Bug Report ID: ${message.id}` })
        .setTimestamp();

      const attachment = message.attachments?.first();
      if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
        bugEmbed.setImage(attachment.url);
      }
      if (media) {
        bugEmbed.addFields({ name: 'Media', value: media, inline: false });
      }

      await message.channel.send({ embeds: [bugEmbed] });

      success(`New bug report created by ${message.author.tag} in ${message.guild.name}`);
    } catch (error) {
      console.error('Error processing bug report:', error);
    }
  }

/**
 * handle a suggestion message
 * @param {Message} message
 */
async function handleSuggestion(message) {
  try {
    const suggestionEmbed = new EmbedBuilder()
      .setColor(0x323339)
      .addFields(
        { name: 'Submitter', value: message.author.username, inline: true },
        { name: 'Suggestion', value: message.content, inline: false },
        { name: 'Results so far', value: '<:g_checkmark:1205513702783189072>: 0\n<:r_cross:1205513709963976784>: 0', inline: false }
      )
      .setFooter({ text: `Suggestion ID: ${message.id}` })
      .setTimestamp();
    
    await message.delete().catch(err => {
      console.error('Error deleting original suggestion message:', err);
    });
    
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggestion_upvote_${message.id}`)
        .setEmoji('<:g_checkmark:1205513702783189072>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`suggestion_downvote_${message.id}`)
        .setEmoji('<:r_cross:1205513709963976784>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`suggestion_viewvotes_${message.id}`)
        .setLabel('View')
        .setStyle(ButtonStyle.Secondary)
    );

    const suggestionMessage = await message.channel.send({
      embeds: [suggestionEmbed],
      components: [row]
    });

    await addSuggestion(
      suggestionMessage.id,
      message.channel.id,
      message.author.id
    );
    
    success(`New suggestion created by ${message.author.tag} in ${message.guild.name}`);
  } catch (err) {
    error('Error processing suggestion:', err);
  }
}
