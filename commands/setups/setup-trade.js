import { PermissionsBitField, ChannelType, SlashCommandBuilder } from 'discord.js';
import { setTradeChannel } from '../../database/models/trade.js';
import config from '../../config.js';
import { success, error } from '../../utils/logger.js';

export default {
  name: 'setup-trade',
  data: new SlashCommandBuilder()
    .setName('setup-trade')
    .setDescription('Set up a trade channel for users')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Existing channel to use for trades (optional)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    let hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                        interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
    
    if (!hasPermission && config.roles.mainServer.managerRole && config.channels.mainServer.guildId) {
      try {
        const mainGuild = await interaction.client.guilds.fetch(config.channels.mainServer.guildId).catch(() => null);
        if (mainGuild) {
          const mainMember = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
          if (mainMember && mainMember.roles.cache.has(config.roles.mainServer.managerRole)) {
            hasPermission = true;
          }
        }
      } catch (err) {
        console.error('Error checking manager role in main server:', err);
      }
    }
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to set up the trade system.', 
        ephemeral: true 
      });
    }
    
    try {
      let channel = interaction.options.getChannel('channel');
      
      if (!channel) {
        channel = await interaction.guild.channels.create({
          name: 'trades',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.SendMessages],
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            {
              id: interaction.client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            }
          ]
        });
      }
      
      await setTradeChannel(interaction.guild.id, channel.id);
      
      await channel.send({
        embeds: [{
          title: '🔄 Trade Channel',
          description: 'Post your trade requests here using the following format:',
          fields: [{
            name: 'Format',
            value: '```\n[Trade] What you\'re looking for\n[Item Offer] What you\'re offering\n```',
            inline: false
          }],
          color: 0x00FF00
        }]
      });
      
      success(`Trade channel set to ${channel.name} in guild ${interaction.guild.name}`);
      return interaction.reply({
        content: `Trade channel has been set up: ${channel}`,
        ephemeral: true
      });
    } catch (err) {
      error('Error setting up trade channel', err);
      return interaction.reply({
        content: `Failed to set up trade system: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
