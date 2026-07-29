import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import config from '../../config.js';
import { fetchProfile } from '../../utils/fetchProfile.js';

export default {
  name: 'background-check',
  data: new SlashCommandBuilder()
    .setName('background-check')
    .setDescription('Perform a background check on a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to perform a background check on')
        .setRequired(true)
    ),
  async execute(interaction) {
    let hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    
    if (!hasPermission && config.roles.mainServer.staffManagerRole && config.channels.mainServer.guildId) {
      try {
        const mainGuild = await interaction.client.guilds.fetch(config.channels.mainServer.guildId).catch(() => null);
        if (mainGuild) {
          const mainMember = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
          if (mainMember && mainMember.roles.cache.has(config.roles.mainServer.staffManagerRole)) {
            hasPermission = true;
          }
        }
      } catch (err) {
        console.error('Error checking staff manager role in main server:', err);
      }
    }
    
    if (!hasPermission) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
    }

    const targetUser = interaction.options.getUser('user');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    await interaction.deferReply({ flags: 64 });

    const embed = new EmbedBuilder()
      .setTitle(`Background Check: ${targetUser.tag}`)
      .setColor(0x5865F2)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'User ID', value: targetUser.id, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Server', value: targetMember ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'Not in server', inline: true }
      );

    if (targetMember) {
      const roles = targetMember.roles.cache
        .filter(role => role.id !== interaction.guild.id)
        .map(role => role.name)
        .join(', ') || 'None';
      
      embed.addFields(
        { name: 'Roles', value: roles.length > 100 ? roles.substring(0, 100) + '...' : roles, inline: false }
      );
    }

    try {
      const profile = await fetchProfile(targetUser.id);
      if (profile && profile.minecraft_username) {
        embed.addFields(
          { name: 'Minecraft Account', value: profile.minecraft_username, inline: true },
          { name: 'Linked On', value: profile.linked_at ? `<t:${Math.floor(new Date(profile.linked_at).getTime() / 1000)}:R>` : 'Unknown', inline: true }
        );
      } else {
        embed.addFields({ name: 'Minecraft Account', value: 'Not linked', inline: true });
      }
    } catch (err) {
      embed.addFields({ name: 'Minecraft Account', value: 'Unable to fetch', inline: true });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
