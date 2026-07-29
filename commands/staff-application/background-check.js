import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import config from '../../config.js';
import { LinkerDb } from '../../database/linkerDb.js';
import { getPlayerByName, getPlayerPlaytime, getPlayerKills, getPlayerDeaths, getPlayerVotes, getPlayerPing, getPlayerGeolocations } from '../../database/planDb.js';
import { getPlayerBans, getPlayerMutes, getPlayerKicks, getPlayerWarnings, getActiveBan, getActiveMute } from '../../database/litebansDb.js';

function formatPlaytime(ms) {
  if (!ms) return '0h';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

export default {
  name: 'background-check',
  data: new SlashCommandBuilder()
    .setName('background-check')
    .setDescription('Perform a background check on a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The Discord user to perform a background check on')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('username')
        .setDescription('The Minecraft username to perform a background check on')
        .setRequired(false)
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
    const targetUsername = interaction.options.getString('username');

    if (!targetUser && !targetUsername) {
      return interaction.reply({ content: 'You must provide either a Discord user or a Minecraft username.', flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    let minecraftUsername = null;
    let minecraftUUID = null;
    let discordUser = null;
    let discordMember = null;

    if (targetUser) {
      discordUser = targetUser;
      discordMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    } else if (targetUsername) {
      minecraftUsername = targetUsername;
      const player = await getPlayerByName(targetUsername);
      if (player) {
        minecraftUUID = player.uuid;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Background Check: ${discordUser ? discordUser.tag : minecraftUsername}`)
      .setColor(0x5865F2)
      .setThumbnail(discordUser ? discordUser.displayAvatarURL({ size: 256 }) : null);

    if (discordUser) {
      embed.addFields(
        { name: '**👤 Discord Info**', value: '\u200b', inline: false },
        { name: 'User ID', value: discordUser.id, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(discordUser.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Server', value: discordMember ? `<t:${Math.floor(discordMember.joinedTimestamp / 1000)}:R>` : 'Not in server', inline: true }
      );
    }

    try {
      if (discordUser && !minecraftUUID) {
        const linkerDb = new LinkerDb(config.linker);
        const link = await linkerDb.getLinkByDiscord(discordUser.id);
        if (link) {
          minecraftUsername = link.username;
          minecraftUUID = link.uuid;
        }
      }
    } catch (err) {
      console.error('Error fetching link from database:', err);
    }

    if (minecraftUsername) {
      embed.addFields(
        { name: '══════════════════════════════════', value: '\u200b', inline: false },
        { name: '**⛏️ Minecraft Info**', value: '\u200b', inline: false },
        { name: 'Username', value: minecraftUsername, inline: true }
      );
      if (discordUser) {
        embed.addFields({ name: 'Linked On', value: 'Linked', inline: true });
      }
    } else if (discordUser) {
      embed.addFields(
        { name: '══════════════════════════════════', value: '\u200b', inline: false },
        { name: '**⛏️ Minecraft Info**', value: '\u200b', inline: false },
        { name: 'Status', value: 'Not linked', inline: true }
      );
    }

    if (minecraftUUID) {
      try {
        embed.addFields({ name: 'UUID', value: `\`${minecraftUUID}\``, inline: true });

        const playtime = await getPlayerPlaytime(minecraftUUID);
        if (playtime) {
          embed.addFields({ name: 'Total Playtime', value: formatPlaytime(playtime.total_playtime), inline: true });
          embed.addFields({ name: 'Sessions', value: playtime.session_count.toString(), inline: true });
          if (playtime.first_login) {
            embed.addFields({ name: 'First Login', value: `<t:${Math.floor(playtime.first_login / 1000)}:R>`, inline: true });
          }
          if (playtime.last_login) {
            embed.addFields({ name: 'Last Login', value: `<t:${Math.floor(playtime.last_login / 1000)}:R>`, inline: true });
          }
        }

        const kills = await getPlayerKills(minecraftUUID);
        const deaths = await getPlayerDeaths(minecraftUUID);
        if (kills && deaths) {
          const kd = deaths.total_deaths > 0 ? (kills.total_kills / deaths.total_deaths).toFixed(2) : kills.total_kills.toFixed(2);
          embed.addFields({ name: 'Kills', value: kills.total_kills.toString(), inline: true });
          embed.addFields({ name: 'Deaths', value: deaths.total_deaths.toString(), inline: true });
          embed.addFields({ name: 'K/D Ratio', value: kd, inline: true });
        }

        const votes = await getPlayerVotes(minecraftUUID);
        if (votes && votes.total_votes) {
          embed.addFields({ name: 'Total Votes', value: votes.total_votes.toString(), inline: true });
        }

        const ping = await getPlayerPing(minecraftUUID);
        if (ping && ping.avg_ping) {
          embed.addFields({ name: 'Avg Ping', value: `${Math.round(ping.avg_ping)}ms`, inline: true });
        }

        const geolocations = await getPlayerGeolocations(minecraftUUID);
        if (geolocations && geolocations.length > 0) {
          const geoList = geolocations.slice(0, 3).map(g => g.geolocation).join(', ');
          embed.addFields({ name: 'Recent Locations', value: geoList + (geolocations.length > 3 ? ` (+${geolocations.length - 3})` : ''), inline: false });
        }

      } catch (err) {
        console.error('Error fetching plan data:', err);
        embed.addFields({ name: 'Server Data', value: 'Unable to fetch', inline: false });
      }
    }

    if (minecraftUUID) {
      try {
        const bans = await getPlayerBans(minecraftUUID);
        const mutes = await getPlayerMutes(minecraftUUID);
        const kicks = await getPlayerKicks(minecraftUUID);
        const warnings = await getPlayerWarnings(minecraftUUID);
        const activeBan = await getActiveBan(minecraftUUID);
        const activeMute = await getActiveMute(minecraftUUID);

        const punishmentCount = bans.length + mutes.length + kicks.length + warnings.length;
        
        if (punishmentCount > 0 || activeBan || activeMute) {
          embed.addFields({ name: '\u200b', value: '**⚖️ Punishment History**', inline: false });
          
          if (activeBan) {
            const expiry = activeBan.until === 0 ? 'Permanent' : `<t:${Math.floor(activeBan.until / 1000)}:R>`;
            embed.addFields({ name: '🔴 Active Ban', value: `${expiry} - ${activeBan.reason?.substring(0, 50) || 'No reason'}`, inline: false });
          }
          
          if (activeMute) {
            const expiry = activeMute.until === 0 ? 'Permanent' : `<t:${Math.floor(activeMute.until / 1000)}:R>`;
            embed.addFields({ name: '🔇 Active Mute', value: `${expiry} - ${activeMute.reason?.substring(0, 50) || 'No reason'}`, inline: false });
          }

          embed.addFields({ name: 'Total Bans', value: bans.length.toString(), inline: true });
          embed.addFields({ name: 'Total Mutes', value: mutes.length.toString(), inline: true });
          embed.addFields({ name: 'Total Kicks', value: kicks.length.toString(), inline: true });
          embed.addFields({ name: 'Total Warnings', value: warnings.length.toString(), inline: true });

          if (bans.length > 0) {
            const recentBan = bans[0];
            const banStatus = recentBan.active ? 'Active' : (recentBan.removed_by_name ? `Removed by ${recentBan.removed_by_name}` : 'Expired');
            embed.addFields({ name: 'Recent Ban', value: `${banStatus} - ${recentBan.reason?.substring(0, 30) || 'No reason'}`, inline: false });
          }
        } else {
          embed.addFields({ name: '⚖️ Punishment History', value: 'Clean record - No punishments found', inline: false });
        }

      } catch (err) {
        console.error('Error fetching litebans data:', err);
        embed.addFields({ name: 'Punishment Data', value: 'Unable to fetch', inline: false });
      }
    }

    embed.setFooter({ text: `Background check performed by ${interaction.user.tag}` });
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
