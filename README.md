# Fusion-Manager

A Discord bot for managing bug reports and moderation tasks.

## Features

- Bug reporting system
- Moderation commands (ban, kick, timeout)
- User profiles with bug statistics
- Media account tracking

## Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure your `config/config.json` file with your Discord token and role IDs
4. Start the bot with `node index.js`

## Commands

### Bug Management
- `/bug-report` - Set up a bug reporting channel
- `/bug-accept <msg_id>` - Accept a bug report
- `/bug-decline <msg_id> <reason>` - Decline a bug report
- `/bug-list <type>` - List all bugs with a specific status

### Moderation
- `/ban <user>` - Ban a user from the server
- `/kick <user>` - Kick a user from the server
- `/timeout <user> <duration>` - Timeout a user for a specified duration

### Utility
- `/profile [user]` - View bug reporting statistics for a user
- `/syncmedia` - List YouTube and TikTok accounts of users with the media role