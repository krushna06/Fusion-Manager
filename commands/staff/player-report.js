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
    try {
      await interaction.deferReply({ flags: 64 });
    } catch (deferError) {
      console.error('Error deferring reply:', deferError);
      return;
    }
    
    const guild = await interaction.client.guilds.fetch(config.channels.staffServer.guildId).catch(() => null);
    if (!guild) {
      return interaction.editReply({ 
        content: 'Staff server not found. Please contact an administrator.' 
      });
    }
    
    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      return interaction.editReply({ 
        content: 'You must be a member of the staff server to use this command.' 
      });
    }
    
    const ign = interaction.options.getString('ign');
    const reason = interaction.options.getString('reason');
    let proof = interaction.options.getString('proof');
    
    const allowedDomains = ['youtube.com', 'youtu.be', 'imgur.com', 'postimages.org', 'postimg.cc'];
    const isValidDomain = allowedDomains.some(domain => proof.toLowerCase().includes(domain));
    
    if (!isValidDomain) {
      return interaction.editReply({ 
        content: 'Invalid proof link. Only YouTube, Imgur, postimages.org, and postimg.cc links are allowed.' 
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
      const reportChannel = await interaction.client.channels.fetch(config.channels.staffServer.playerReportsChannelId).catch(() => null);
      if (!reportChannel) {
        return interaction.editReply({ 
          content: 'Error: Player reports channel not found. Please contact an administrator.' 
        });
      }
      
      await reportChannel.send({ embeds: [embed] });
      await interaction.editReply({ 
        content: '✅ Player report submitted successfully!' 
      });
    } catch (error) {
      console.error('Error submitting player report:', error);
      try {
        await interaction.editReply({ 
          content: 'An error occurred while submitting the report. Please try again later.' 
        });
      } catch (editError) {
        console.error('Error editing reply:', editError);
      }
    }
  }
};
