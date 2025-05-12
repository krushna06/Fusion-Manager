import { PermissionsBitField } from 'discord.js';
import config from '../config/config.json' with { type: 'json' };

/**
 * @param {GuildMember} member
 * @returns {boolean}
 */
function isManager(member) {
  return member.permissions.has(PermissionsBitField.Flags.ManageGuild) || 
         (config.MANAGER_ROLE && member.roles.cache.has(config.MANAGER_ROLE));
}

/**
 * @param {GuildMember} member
 * @returns {boolean}
 */
function isModerator(member) {
  const modPerms = [
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.ModerateMembers
  ];
  
  return modPerms.some(perm => member.permissions.has(perm)) || 
         (config.MODERATOR_ROLE && member.roles.cache.has(config.MODERATOR_ROLE));
}

/**
 * @param {GuildMember} member
 * @returns {boolean}
 */
function isAdmin(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

/**
 * @param {GuildMember} member
 * @returns {boolean}
 */
function isMedia(member) {
  return config.MEDIA_ROLE && member.roles.cache.has(config.MEDIA_ROLE);
}

export {
  isManager,
  isModerator,
  isAdmin,
  isMedia
};
