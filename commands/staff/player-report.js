import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';

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

export default {
  name: 'player-report',
  data: new SlashCommandBuilder()
    .setName('player-report')
    .setDescription('Report a player for rule violations')
    .addStringOption(option => 
      option.setName('ign')
        .setDescription('Minecraft IGN of the player being reported')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the report')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('proof')
        .setDescription('Proof link (YouTube, Imgur, postimages.org, or postimg.cc)')
        .setRequired(true)),
  async execute(interaction) {
    if (interaction.guild.id !== config.STAFF_GUILD_ID) {
      return interaction.reply({ 
        content: 'This command can only be used in the staff server.', 
        flags: 64 
      });
    }
    
    const ign = interaction.options.getString('ign');
    const reason = interaction.options.getString('reason');
    let proof = interaction.options.getString('proof');
    
    const allowedDomains = ['youtube.com', 'youtu.be', 'imgur.com', 'postimages.org', 'postimg.cc'];
    const isValidDomain = allowedDomains.some(domain => proof.toLowerCase().includes(domain));
    
    if (!isValidDomain) {
      return interaction.reply({ 
        content: 'Invalid proof link. Only YouTube, Imgur, postimages.org, and postimg.cc links are allowed.', 
        flags: 64 
      });
    }
    
    proof = await getDirectImageUrl(proof);
    
    const embed = new EmbedBuilder()
      .setTitle('🚨 Player Report')
      .setColor(0xFF0000)
      .addFields(
        { name: 'Reported By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
        { name: 'Player IGN', value: ign, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setImage(proof)
      .setTimestamp()
      .setFooter({ text: `Report ID: ${interaction.id}` });
    
    try {
      const reportChannel = await interaction.client.channels.fetch(config.PLAYER_REPORTS_CHANNEL_ID).catch(() => null);
      if (!reportChannel) {
        return interaction.reply({ 
          content: 'Error: Player reports channel not found. Please contact an administrator.', 
          flags: 64 
        });
      }
      
      await reportChannel.send({ embeds: [embed] });
      await interaction.reply({ 
        content: '✅ Player report submitted successfully!', 
        flags: 64 
      });
    } catch (error) {
      console.error('Error submitting player report:', error);
      await interaction.reply({ 
        content: 'An error occurred while submitting the report. Please try again later.', 
        flags: 64 
      });
    }
  }
};
