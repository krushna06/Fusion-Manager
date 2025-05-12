# Fusion-Manager

A Discord bot for managing bug reports, suggestions, and moderation tasks.

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
- `/bug-system` - Set up a bug reporting channel
- `/bug-accept <msg_id>` - Accept a bug report
- `/bug-decline <msg_id> <reason>` - Decline a bug report with a reason
- `/bug-list <type>` - List all bugs with a specific status (open/accepted/declined)

### Suggestion Management
- `/suggestion-system` - Set up a suggestion channel
- `/suggestion-accept <msg_id>` - Accept a suggestion
- `/suggestion-decline <msg_id> <reason>` - Decline a suggestion with a reason
- `/suggestion-list <type>` - List all suggestions with a specific status

### Moderation
- `/ban <user> [reason]` - Ban a user from the server
- `/kick <user> [reason]` - Kick a user from the server
- `/timeout <user> <duration> [reason]` - Timeout a user for a specified duration

### Utility
- `/profile [user]` - View bug reporting and suggestion statistics for a user
- `/syncmedia` - List YouTube and TikTok accounts of users with the media role & check for a specific keyword in title.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created & maintained by [krushna06](https://github.com/krushna06)