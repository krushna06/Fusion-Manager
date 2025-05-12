import { PermissionsBitField, ChannelType, SlashCommandBuilder } from 'discord.js';
import { setSuggestionChannel } from '../../database/models/guild.js';
import config from '../../config/config.json' with { type: 'json' };
import { success, error, info } from '../../utils/logger.js';

export default {
  name: 'suggestion-system',
  data: new SlashCommandBuilder()
    .setName('suggestion-system')
    .setDescription('Setup a suggestion channel for users'),
  async execute(interaction) {
    const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) || 
                          (config.MANAGER_ROLE && interaction.member.roles.cache.has(config.MANAGER_ROLE));
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to set up the suggestion system.', 
        ephemeral: true 
      });
    }
    
    try {
      const channel = await interaction.guild.channels.create({
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
      
      success(`Suggestion channel created in guild ${interaction.guild.name}`);
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
