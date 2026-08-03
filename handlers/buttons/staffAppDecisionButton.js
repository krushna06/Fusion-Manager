import { updateStaffApplicationStatus, getStaffApplicationByChannel, getStaffApplicationById } from '../../database/mainDb.js';
import { deleteStaffApplication } from '../../database/models/staffApplication.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, PermissionsBitField } from 'discord.js';
import { generateFromMessages } from 'discord-html-transcripts';
import config from '../../config.js';
import { LinkerDb } from '../../database/linkerDb.js';
import { getPlayerByName, getPlayerPlaytime, getPlayerKills, getPlayerDeaths, getPlayerVotes, getPlayerPing, getPlayerGeolocations, getPlayerAccountType, getPlayerActivity } from '../../database/planDb.js';
import { getPlayerBans, getPlayerMutes, getPlayerKicks, getPlayerWarnings, getActiveBan, getActiveMute } from '../../database/litebansDb.js';

function formatPlaytime(ms) {
  if (!ms) return '0h';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

export async function handleStaffAppDecisionButton(interaction) {
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
      content: 'You do not have permission to use this button.', 
      flags: 64 
    });
  }

  const action = interaction.customId.startsWith('staff_accept_') ? 'accept' : 
                interaction.customId.startsWith('staff_reject_') ? 'reject' : 
                interaction.customId.startsWith('staff_bgcheck_') ? 'bgcheck' : 'close';
  const channelId = interaction.customId.split('_').pop();

  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    try {
      await deleteStaffApplication(channelId);
    } catch (deleteError) {
      console.error('Error deleting staff application with missing channel:', deleteError);
    }
    return interaction.reply({ 
      content: 'The channel for this application could not be found. The application has been removed from the database.', 
      flags: 64 
    });
  }

  if (action === 'bgcheck') {
    await interaction.deferReply({ flags: 64 });
  } else {
    await interaction.deferReply({ flags: 64 });
  }

  try {
    if (action === 'accept') {
      await updateStaffApplicationStatus(channelId, 'accepted');
      
      const application = await getStaffApplicationByChannel(channelId);
      if (application && application.staff_id) {
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (channel) {
          await channel.permissionOverwrites.edit(application.staff_id, {
            ViewChannel: true,
            SendMessages: true
          }).catch(console.error);
        }
        
        try {
          const user = await interaction.client.users.fetch(application.staff_id).catch(() => null);
          if (user) {
            await user.send({
              content: `🎉 **Congratulations!** Your staff application has been **shortlisted**! The staff team will review your application further and reach out to you with next steps.`
            }).catch(console.error);
          }
        } catch (dmError) {
          console.error('Error sending DM to user:', dmError);
        }
      }
      
      await interaction.editReply({ content: 'Application accepted.' });
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`schedule_interview_${channelId}`)
            .setLabel('Schedule Interview')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`staff_close_${channelId}`)
            .setLabel('Close Application')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.channel.send({
        content: `<@${application.staff_id}> Congratulations! Your staff application has been shortlisted! The staff team will review your application further and reach out to you with next steps.`,
        components: [row]
      });

      await interaction.message.edit({
        components: []
      });
    } else if (action === 'bgcheck') {
      const application = await getStaffApplicationByChannel(channelId);
      if (!application || !application.staff_id) {
        return interaction.editReply({ content: 'Could not find application data.' });
      }

      const targetUser = await interaction.client.users.fetch(application.staff_id).catch(() => null);
      if (!targetUser) {
        return interaction.editReply({ content: 'Could not find user.' });
      }

      let minecraftUsername = null;
      let minecraftUUID = null;

      try {
        const linkerDb = new LinkerDb(config.linker);
        const link = await linkerDb.getLinkByDiscord(targetUser.id);
        if (link) {
          minecraftUsername = link.username;
          minecraftUUID = link.uuid;
        }
      } catch (err) {
        console.error('Error fetching link from database:', err);
      }
      
      if (!minecraftUsername && application?.responses) {
        try {
          const responses = JSON.parse(application.responses);
          minecraftUsername = responses.ign || responses.minecraft_username;
        } catch (e) {
          console.error('Error parsing responses for username:', e);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Background Check: ${targetUser.tag}`)
        .setColor(0x5865F2)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '**👤 Discord Info**', value: '\u200b', inline: false },
          { name: 'User ID', value: targetUser.id, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Minecraft Username', value: minecraftUsername || 'Not linked', inline: true }
        );

      if (minecraftUsername) {
        embed.addFields(
          { name: '══════════════════════════════════', value: '\u200b', inline: false },
          { name: '**⛏️ Minecraft Info**', value: '\u200b', inline: false },
          { name: 'Username', value: minecraftUsername, inline: true }
        );

        try {
          const player = await getPlayerByName(minecraftUsername);
          if (player) {
            minecraftUUID = player.uuid;
            embed.addFields({ name: 'UUID', value: `\`${minecraftUUID}\``, inline: true });
            embed.addFields({ name: 'Registered', value: `<t:${Math.floor(player.registered / 1000)}:R>`, inline: true });
            embed.addFields({ name: 'Times Kicked', value: player.times_kicked.toString(), inline: true });
          }

          const accountType = await getPlayerAccountType(minecraftUUID);
          if (accountType) {
            embed.addFields({ name: 'Account Type', value: accountType, inline: true });
          }

          const activity = await getPlayerActivity(minecraftUUID, 7);
          if (activity && activity.total_playtime) {
            embed.addFields({ name: 'Activity (7d)', value: `${formatPlaytime(activity.total_playtime)} total`, inline: true });
          }

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

            embed.addFields({ name: 'Punishments', value: `${bans.length} bans, ${mutes.length} mutes, ${kicks.length} kicks, ${warnings.length} warnings`, inline: false });

            if (bans.length > 0) {
              const recentBan = bans[0];
              const banStatus = recentBan.active ? 'Active' : (recentBan.removed_by_name ? `Removed by ${recentBan.removed_by_name}` : 'Expired');
              embed.addFields({ name: 'Recent Ban', value: `${banStatus} - ${recentBan.reason?.substring(0, 30) || 'No reason'}`, inline: false });
            }
          } else {
            embed.addFields({ name: '⚖️ Punishment History', value: 'Clean record - No punishments found', inline: false });
          }

        } catch (err) {
          console.error('Error fetching plan/litebans data:', err);
          embed.addFields({ name: 'Server Data', value: 'Unable to fetch', inline: false });
        }
      } else {
        embed.addFields({ name: 'Status', value: 'Not linked to Minecraft account', inline: true });
      }

      embed.setFooter({ text: `Background check performed by ${interaction.user.tag}` });
      embed.setTimestamp();

      await interaction.editReply({ content: 'Background check completed:', embeds: [embed] });
    } else if (action === 'reject') {
      await updateStaffApplicationStatus(channelId, 'rejected');
      
      const application = await getStaffApplicationByChannel(channelId);
      if (application && application.staff_id) {
        try {
          const user = await interaction.client.users.fetch(application.staff_id).catch(() => null);
          if (user) {
            await user.send({
              content: `❌ **Application Rejected**. Unfortunately, your staff application has been declined at this time. You may apply again in 30 days. Thank you for your interest!`
            }).catch(console.error);
          }
        } catch (dmError) {
          console.error('Error sending DM to user:', dmError);
        }
      }
      
      await interaction.editReply({ content: 'Application rejected.' });
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`staff_close_${channelId}`)
            .setLabel('Close Application')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.channel.send({
        content: `<@${application.staff_id}> Unfortunately, your staff application has been declined at this time. You may apply again in 30 days. Thank you for your interest!`,
        components: [row]
      });

      await interaction.message.edit({
        components: []
      });
    } else if (action === 'close') {
      await updateStaffApplicationStatus(channelId, 'closed');
      
      await interaction.editReply({ content: 'Generating transcript and closing application...' });
      
      const application = await getStaffApplicationByChannel(channelId);
      
      let username = 'unknown';
      let applicationId = application?.id || 'unknown';
      
      if (application?.responses) {
        try {
          const responses = JSON.parse(application.responses);
          username = responses.ign || responses.minecraft_username || 'unknown';
        } catch (e) {
          console.error('Error parsing responses for username:', e);
        }
      }
      
      const messages = await interaction.channel.messages.fetch();
      const transcriptBuffer = await generateFromMessages(messages, interaction.channel, {
        returnType: 'buffer',
        filename: `staff-app-${applicationId}-${username}.html`
      });
      
      const transcriptAttachment = new AttachmentBuilder(transcriptBuffer, {
        name: `staff-app-${applicationId}-${username}.html`
      });
      
      const createdAt = application?.created_at ? new Date(application.created_at) : new Date();
      const closedAt = new Date();
      const daysDiff = Math.floor((closedAt - createdAt) / (1000 * 60 * 60 * 24));
      
      const formatDate = (date) => date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      let closeReason = 'Closed';
      if (application?.status === 'accepted') {
        closeReason = 'Accepted';
      } else if (application?.status === 'rejected') {
        closeReason = 'Denied';
      }
      
      const embed = new EmbedBuilder()
        .setTitle('Application Closed')
        .setColor(0x5865F2)
        .addFields(
          { name: 'Application ID', value: `#${applicationId}`, inline: true },
          { name: 'Topic', value: username, inline: true },
          { name: 'Created at', value: formatDate(createdAt), inline: true },
          { name: 'Closed at', value: formatDate(closedAt), inline: true },
          { name: '\u200b', value: `(after ${daysDiff} days)`, inline: true },
          { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Closed because', value: closeReason, inline: true }
        );
      
      if (config.channels.mainServer.staffApplicationLogsChannelId) {
        const logsChannel = await interaction.guild.channels.fetch(config.channels.mainServer.staffApplicationLogsChannelId).catch(() => null);
        if (logsChannel) {
          await logsChannel.send({
            embeds: [embed],
            files: [transcriptAttachment]
          });
        }
      }
      
      await interaction.editReply({ content: 'Staff application closed and logged.' });
      
      setTimeout(async () => {
        await interaction.channel.delete('Staff application closed by manager');
      }, 2000);
    }
  } catch (error) {
    console.error('Error handling staff application decision:', error);
    await interaction.editReply({ content: 'An error occurred while processing your decision.' });
  }
}
