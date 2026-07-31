import { PermissionsBitField, ChannelType, SlashCommandBuilder } from 'discord.js';
import { setLOAChannel } from '../../database/mainDb.js';
import config from '../../config.js';
import { success, error } from '../../utils/logger.js';

export default {
  name: 'setup-loa',
  data: new SlashCommandBuilder()
    .setName('setup-loa')
    .setDescription('Setup a Leave of Absence system for staff')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Existing channel to use for LOA (optional)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addRoleOption(option =>
      option.setName('manager_role')
        .setDescription('Role that can receive LOA explanations (Staff Manager)')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName('manager_role_2')
        .setDescription('Additional role that can receive LOA explanations (optional)')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName('manager_role_3')
        .setDescription('Additional role that can receive LOA explanations (optional)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('log_channel')
        .setDescription('Channel where LOA requests will be logged (optional)')
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
        content: 'You do not have permission to set up the LOA system.' 
      });
    }
    
    try {
      let channel = interaction.options.getChannel('channel');
      let managerRole = interaction.options.getRole('manager_role');
      let managerRole2 = interaction.options.getRole('manager_role_2');
      let managerRole3 = interaction.options.getRole('manager_role_3');
      let logChannel = interaction.options.getChannel('log_channel');
      
      const managerRoleIds = [];
      if (managerRole) managerRoleIds.push(managerRole.id);
      if (managerRole2) managerRoleIds.push(managerRole2.id);
      if (managerRole3) managerRoleIds.push(managerRole3.id);
      
      if (!channel) {
        channel = await interaction.guild.channels.create({
          name: 'leave-of-absence',
          type: ChannelType.GuildText,
          topic: 'Staff Leave of Absence requests'
        });
        success(`New LOA channel created in guild ${interaction.guild.name}`);
      }
      
      await setLOAChannel(interaction.guild.id, channel.id, managerRoleIds.length > 0 ? managerRoleIds : null, logChannel?.id || null);
      
      await channel.send({
        embeds: [{
          title: '🏖️ Leave of Absence',
          description: 'Need time away from your staff duties? Request it here, do not just go inactive.',
          fields: [
            {
              name: 'How to request',
              value: 'Run `/loa` and fill in:\n• **Start** and **end** dates (e.g. `2026-07-20`)\n• **Reason**'
            },
            {
              name: 'The rules',
              value: '• You have a **7-day leave balance each month**. A request within your remaining balance is approved automatically, and you get a DM confirming it.\n• A request over your remaining balance is **auto-denied**. You get a DM with a button to send an explanation to the Staff Manager if it is a genuine emergency.\n• Needing more than 7 days in a month is treated as a resignation and is handled by management directly.'
            },
            {
              name: 'Privacy',
              value: 'Your confirmation when you submit is only visible to you.'
            }
          ],
          color: 0x5865F2
        }]
      });
      
      success(`LOA channel set to ${channel.name} in guild ${interaction.guild.name}`);
      const rolesText = managerRoleIds.length > 0 
        ? ` with manager roles: ${managerRoleIds.map(id => `<@&${id}>`).join(', ')}` 
        : '';
      const logText = logChannel ? ` with log channel: ${logChannel}` : '';
      return interaction.editReply({
        content: `LOA system has been set up: ${channel}${rolesText}${logText}`
      });
    } catch (err) {
      error('Error setting up LOA channel', err);
      return interaction.editReply({
        content: `Failed to set up LOA system: ${err.message}`
      });
    }
  }
};
