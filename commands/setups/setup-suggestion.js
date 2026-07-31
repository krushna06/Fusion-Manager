import { PermissionsBitField, ChannelType, SlashCommandBuilder } from 'discord.js';
import { setSuggestionChannel } from '../../database/models/guild.js';
import config from '../../config.js';
import { success, error, info } from '../../utils/logger.js';

export default {
  name: 'setup-suggestion',
  data: new SlashCommandBuilder()
    .setName('setup-suggestion')
    .setDescription('Setup a suggestion channel for users')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Existing channel to use for suggestions (optional)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    
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
      return interaction.editReply({ 
        content: 'You do not have permission to set up the suggestion system.' 
      });
    }
    
    try {
      let channel = interaction.options.getChannel('channel');
      
      if (!channel) {
        channel = await interaction.guild.channels.create({
          name: 'suggestions',
          type: ChannelType.GuildText,
          topic: 'Submit your suggestions in this channel',
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            }
          ]
        });
        success(`New suggestion channel created in guild ${interaction.guild.name}`);
      }
      
      await setSuggestionChannel(interaction.guild.id, channel.id);
      
      await channel.send({
        embeds: [{
          title: '💡 Suggestion System',
          description: 'Use this channel to submit your suggestions for the server!',
          fields: [
            {
              name: 'How to Submit',
              value: 'Simply type your suggestion in this channel. The bot will format it and add voting reactions.'
            },
            {
              name: 'Voting',
              value: 'Use the reactions to vote on suggestions:\n✅ - Support the suggestion\n❌ - Against the suggestion'
            }
          ],
          color: 0x4287f5
        }]
      });
      
      success(`Suggestion channel set to ${channel.name} in guild ${interaction.guild.name}`);
      return interaction.editReply({
        content: `Suggestion channel has been set up: ${channel}`
      });
    } catch (err) {
      error('Error setting up suggestion channel', err);
      return interaction.editReply({
        content: `Failed to set up suggestion system: ${err.message}`
      });
    }
  }
};
