import { PermissionsBitField } from 'discord.js';
import config from '../config.js';

function toRoleArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

export async function hasStaffApplicationReviewPermission(interaction) {
  if (interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }

  const allowedRoles = new Set([
    ...toRoleArray(config.roles.mainServer.staffManagerRole),
    ...toRoleArray(config.roles.mainServer.managerRole)
  ]);

  if (allowedRoles.size === 0) {
    return false;
  }

  const guildId = config.channels.mainServer.guildId;
  if (!guildId) {
    return false;
  }

  try {
    const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      return false;
    }

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      return false;
    }

    return member.roles.cache.some(role => allowedRoles.has(role.id));
  } catch (error) {
    console.error('Error checking staff application review permission:', error);
    return false;
  }
}
