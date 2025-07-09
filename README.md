# MALAZ BOTT - Discord Music Bot

A feature-rich Discord music bot built with Node.js and Discord.js that supports playing music from YouTube and Spotify links, with advanced autoplay functionality and queue management.

## 🎵 Features

- **Multi-Platform Support**: Play music from YouTube and Spotify links
- **Autoplay**: Automatically plays related songs when the queue ends
- **Queue Management**: Add, skip, and insert songs in the queue
- **Smart Search**: Intelligent search for related music by artist
- **Duration Filtering**: Autoplay only plays songs under 6 minutes
- **Docker Support**: Easy deployment with Docker containers

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- FFmpeg installed on your system
- Discord Bot Token
- YouTube Data API v3 Key (optional, for enhanced autoplay)
- Spotify API Credentials (optional, for Spotify link support)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MALAZ-BOTT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   YOUTUBE_API_KEY=your_youtube_api_key_here
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   ```

4. **Run the bot**
   ```bash
   node index.js
   ```

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Or build manually**
   ```bash
   docker build -t malaz-bott .
   docker run -d --name malaz-bott malaz-bott
   ```

## 📋 Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `c!play <url/query>` | Play music from YouTube/Spotify URL or search query | `c!play https://youtube.com/watch?v=...` |
| `c!skip` | Skip the current song | `c!skip` |
| `c!insert <url/query>` | Insert a song next in the queue | `c!insert https://spotify.com/track/...` |
| `c!autoplay` | Toggle autoplay on/off | `c!autoplay` |
| `c!help` | Show all available commands | `c!help` |

## 🔧 Configuration

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token and add it to your `.env` file
5. Enable the following intents:
   - Message Content Intent
   - Server Members Intent
   - Voice States Intent

### YouTube API Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Add the API key to your `.env` file

### Spotify API Setup (Optional)

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy the Client ID and Client Secret
4. Add them to your `.env` file

## 🎯 Features in Detail

### Autoplay System
- Automatically finds related songs when the queue ends
- Searches by artist name for better relevance
- Filters out duplicate songs and videos longer than 6 minutes
- Falls back to random popular music if no related songs found

### Smart Search
- Extracts artist names from song titles
- Uses multiple search strategies for better results
- Handles various title formats (Artist - Song, Artist by Song, etc.)

### Queue Management
- Add songs to the end of the queue
- Insert songs next in the queue
- Skip current song
- Automatic queue progression

## 🐳 Docker Configuration

The bot is configured to run in a Debian-based container for optimal FFmpeg support. The Dockerfile includes:

- Node.js 18 runtime
- FFmpeg installation
- Proper user permissions
- Health checks

## 📁 Project Structure

```
MALAZ-BOTT/
├── index.js              # Main bot file
├── package.json          # Dependencies and scripts
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose setup
├── .env                 # Environment variables (create this)
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure and rotate them regularly
- The bot only requires basic Discord permissions

## 🛠️ Troubleshooting

### Common Issues

1. **Bot not joining voice channel**
   - Ensure the bot has "Connect" and "Speak" permissions
   - Check that voice intents are enabled

2. **No audio output**
   - Verify FFmpeg is installed on your system
   - Check that the bot has proper audio permissions

3. **Autoplay not working**
   - Ensure YouTube API key is configured (optional)
   - Check internet connectivity

4. **Spotify links not working**
   - Verify Spotify API credentials are set
   - Check that the Spotify app has proper permissions

### Logs

The bot logs important events to the console. Check the logs for error messages and debugging information.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API wrapper
- [@discordjs/voice](https://github.com/discordjs/voice) - Voice functionality
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube video downloader
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) - Spotify integration

## 📞 Support

If you encounter any issues or have questions, please:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Create an issue on the repository

---

**Note**: This bot is for educational and personal use. Please respect YouTube's and Spotify's terms of service when using this bot. 