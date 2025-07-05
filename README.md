# MALAZ BOTT - Discord Music Bot

## Features
- Play music from YouTube using `c!play <song name or URL>`
- **Spotify link support** - Play songs directly from Spotify links
- **Skip functionality** - Skip current song with `c!skip`
- **YouTube API-powered autoplay** - Finds related videos and popular music
- Smart autoplay with notifications

## Setup

### 1. Install dependencies:
```bash
npm install
```

### 2. Get YouTube API Key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy your API key

### 3. Get Spotify API Credentials:
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Create a new app
3. Copy your **Client ID** and **Client Secret**

### 4. Configure the bot:
Open `index.js` and replace:
- `YOUR_BOT_TOKEN_HERE` with your Discord bot token
- `YOUR_YOUTUBE_API_KEY_HERE` with your YouTube API key
- `YOUR_SPOTIFY_CLIENT_ID_HERE` with your Spotify Client ID
- `YOUR_SPOTIFY_CLIENT_SECRET_HERE` with your Spotify Client Secret

### 5. Run the bot:
```bash
node index.js
```

## Docker Setup
```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f
```

## Usage
- Join a voice channel and type:
  - `c!play <song name>` - Search and play music
  - `c!play <YouTube URL>` - Play direct YouTube links
  - `c!play <Spotify track URL>` - Play songs from Spotify links
  - `c!skip` - Skip the current song
  - `c!autoplay on` or `c!autoplay off` - Toggle autoplay

## Supported Link Types
- **YouTube:** `https://www.youtube.com/watch?v=...`
- **YouTube Shorts:** `https://youtu.be/...`
- **Spotify:** `https://open.spotify.com/track/...`

## Autoplay Features
- **Related Videos**: Uses YouTube API to find videos related to the current song
- **Popular Music**: Falls back to trending/popular music if no related videos found
- **Smart Notifications**: Shows what song was added to the queue
- **Music Category Only**: Only plays music videos, not other content

## Requirements
- Node.js v18 or higher
- A Discord bot token ([How to get one?](https://discord.com/developers/applications))
- YouTube Data API v3 key ([How to get one?](https://console.cloud.google.com/))
- Spotify API credentials ([How to get one?](https://developer.spotify.com/dashboard/)) 