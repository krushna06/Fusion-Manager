// map to store command cooldowns: userId-commandName -> timestamp
const cooldowns = new Map();

/**
 * Default cooldown duration in milliseconds
 */
const DEFAULT_COOLDOWN = 3000;

/**
 * @param {string} userId
 * @param {string} commandName
 * @param {number} [cooldownAmount=DEFAULT_COOLDOWN]
 * @returns {number|false}
 */
function checkCooldown(userId, commandName, cooldownAmount = DEFAULT_COOLDOWN) {
  const key = `${userId}-${commandName}`;
  const now = Date.now();
  
  if (cooldowns.has(key)) {
    const expirationTime = cooldowns.get(key) + cooldownAmount;
    
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return Math.ceil(timeLeft);
    }
  }
  
  return false;
}

/**
 * Set a cooldown for a command
 * @param {string} userId - The user's ID
 * @param {string} commandName - The command name
 */
function setCooldown(userId, commandName) {
  const key = `${userId}-${commandName}`;
  cooldowns.set(key, Date.now());
}

/**
 * Clear a cooldown for a command
 * @param {string} userId - The user's ID
 * @param {string} commandName - The command name
 */
function clearCooldown(userId, commandName) {
  const key = `${userId}-${commandName}`;
  cooldowns.delete(key);
}

function clearAllCooldowns() {
  cooldowns.clear();
}

export {
  checkCooldown,
  setCooldown,
  clearCooldown,
  clearAllCooldowns,
  DEFAULT_COOLDOWN
};
