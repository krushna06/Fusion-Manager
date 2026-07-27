# Fusion-Manager

A comprehensive Discord bot for managing bug reports, suggestions, staff applications, trades, moderation tasks, and Minecraft rank synchronization.

## Features

- Bug reporting system with status tracking
- Suggestion system with voting and moderation
- Staff application management
- Trade system for in-game or server trades
- Moderation tools (ban, kick, timeout, purge)
- User profiles with activity statistics
- Media account tracking and monitoring
- Sniper system for monitoring specific keywords
- Staff report system
- Minecraft-Discord rank synchronization with automatic role syncing based on in-game ranks

## Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure your `config/config.json` file with your Discord token and role IDs
4. Start the bot with `node index.js`

## Commands

### Bug Management
- `/bug-system` - Set up a bug reporting channel
- `/bug-accept <msg_id>` - Accept a bug report
- `/bug-decline <msg_id> <reason>` - Decline a bug report with a reason
- `/bug-list <type>` - List all bugs with a specific status (open/accepted/declined)

### Suggestion Management
- `/suggestion-system` - Set up a suggestion channel
- `/suggestion-accept <msg_id>` - Accept a suggestion
- `/suggestion-decline <msg_id> <reason>` - Decline a suggestion with a reason
- `/suggestion-list <type>` - List all suggestions with a specific status

### Staff Applications
- `/staff-application` - Set up staff application system
- `/staff-application add-user <user>` - Add a user to the staff application whitelist
- `/staff-application remove-user <user>` - Remove a user from the staff application whitelist
- `/staff-application close <reason>` - Close the staff application system

### Trade System
- `/trade-system` - Set up the trade channel
- `/trade-list` - List all active trades

### Moderation
- `/ban <user> [reason]` - Ban a user from the server
- `/kick <user> [reason]` - Kick a user from the server
- `/timeout <user> <duration> [reason]` - Timeout a user for a specified duration
- `/purge <amount>` - Delete multiple messages at once
- `/sniper-add <keyword>` - Add a keyword to monitor in media posts
- `/ssreport <user> <reason>` - Report a user for suspicious activity

### Utility
- `/profile [user]` - View bug reporting and suggestion statistics for a user
- `/syncmedia` - List YouTube and TikTok accounts of users with the media role & check for a specific keyword in title.

### Minecraft Rank Synchronization
- `/link <code>` - Link your Minecraft account to Discord using a code from in-game
- `/unlink` - Unlink your Minecraft account from Discord
- `/info [member|username]` - Show player information including ranks and link status
- `/admin-sync` - Run a full sync sweep now
- `/admin-lookup [member|username]` - Review a player's link, ranks and history
- `/admin-unlink [member|username]` - Force unlink an account
- `/admin-forcelink <member> <username>` - Manually link a Discord member to a Minecraft account
- `/admin-resync [member|username]` - Re-run the sync for one player
- `/admin-grant <member>` - Give Donator manually and exempt from auto-removal
- `/admin-ungrant <member> [remove_role]` - Remove a manual Donator grant
- `/admin-booster <grant|revoke> [member|username]` - Manually grant or revoke in-game booster rank

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created & maintained by [krushna06](https://github.com/krushna06)