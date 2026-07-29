import { PermissionsBitField, ChannelType, SlashCommandBuilder } from 'discord.js';
import { setSuggestionChannel } from '../../database/models/guild.js';
import config from '../../config.js';
import { success, error, info } from '../../utils/logger.js';

export default {
  name: 'suggestion-setup',
  data: new SlashCommandBuilder()
    .setName('suggestion-setup')
    .setDescription('Setup a suggestion channel for users')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Existing channel to use for suggestions (optional)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction) {
    const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) || 
                          (config.roles.mainServer.staffManagerRole && interaction.member.roles.cache.has(config.roles.mainServer.staffManagerRole));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to set up the suggestion system.', 
        ephemeral: true 
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
      return interaction.reply({
        content: `Suggestion channel has been set up: ${channel}`,
        ephemeral: true
      });
    } catch (err) {
      error('Error setting up suggestion channel', err);
      return interaction.reply({
        content: `Failed to set up suggestion system: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
