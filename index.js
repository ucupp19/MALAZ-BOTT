const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const { spawn } = require('child_process');
const { google } = require('googleapis');
const SpotifyWebApi = require('spotify-web-api-node');

const TOKEN = 'MTM2NzQ2MzMwNTk3NDkxMTAyNg.GOdKjn.ziWEoeEXXPFUcFCYFFl7g6NUrF2AxNqNUYOzBo'; // Replace with your bot token
const YOUTUBE_API_KEY = 'AIzaSyCmXiRImlmawhMtZPAI_Ga_6tLMIMISSlc'; // Replace with your YouTube API key
const SPOTIFY_CLIENT_ID = 'aad3f037004f46108c45724bd167b587'; // Replace with your Spotify Client ID
const SPOTIFY_CLIENT_SECRET = '8d731e7762404564a8020cfbc87dc2c7'; // Replace with your Spotify Client Secret
const PREFIX = 'c!';

const youtube = google.youtube('v3');
const spotifyApi = new SpotifyWebApi({
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

let queue = [];
let isPlaying = false;
let currentConnection = null;
let currentPlayer = null;
let currentChannel = null;
let currentTextChannel = null;
let autoplay = true;
let isAutoplaySearching = false; // Guard to prevent autoplay flood

// Initialize Spotify access token
async function initializeSpotify() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log('Spotify API initialized successfully');
    } catch (error) {
        console.error('Error initializing Spotify API:', error);
    }
}

async function searchYouTube(query) {
    return new Promise((resolve, reject) => {
        const ytdl = spawn('yt-dlp', [
            '--get-title',
            '--get-id',
            '--no-playlist',
            '--default-search', 'ytsearch',
            query
        ]);

        let output = '';
        ytdl.stdout.on('data', (data) => {
            output += data.toString();
        });

        ytdl.on('close', (code) => {
            if (code === 0) {
                const lines = output.trim().split('\n');
                if (lines.length >= 2) {
                    const title = lines[0];
                    const videoId = lines[1];
                    resolve({
                        title: title,
                        url: `https://www.youtube.com/watch?v=${videoId}`
                    });
                } else {
                    reject(new Error('No results found'));
                }
            } else {
                reject(new Error('Search failed'));
            }
        });

        ytdl.on('error', (err) => {
            reject(err);
        });
    });
}

async function getYouTubeStream(url) {
    return new Promise((resolve, reject) => {
        const ytdl = spawn('yt-dlp', [
            '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
            '-o', '-',
            url
        ]);

        ytdl.on('error', (err) => {
            reject(err);
        });

        resolve(ytdl.stdout);
    });
}

async function getRelatedVideos(videoId) {
    try {
        const response = await youtube.search.list({
            key: YOUTUBE_API_KEY,
            part: 'snippet',
            relatedToVideoId: videoId,
            type: 'video',
            maxResults: 10
        });

        if (response.data.items && response.data.items.length > 0) {
            // Filter for music-related videos (check title for music keywords)
            const musicVideos = response.data.items.filter(item => {
                const title = item.snippet.title.toLowerCase();
                const musicKeywords = ['music', 'song', 'audio', 'lyrics', 'official', 'video', 'feat', 'ft'];
                return musicKeywords.some(keyword => title.includes(keyword));
            });

            if (musicVideos.length > 0) {
                const randomVideo = musicVideos[Math.floor(Math.random() * musicVideos.length)];
                return {
                    title: randomVideo.snippet.title,
                    url: `https://www.youtube.com/watch?v=${randomVideo.id.videoId}`
                };
            } else {
                // If no music videos found, use any related video
                const randomVideo = response.data.items[Math.floor(Math.random() * response.data.items.length)];
                return {
                    title: randomVideo.snippet.title,
                    url: `https://www.youtube.com/watch?v=${randomVideo.id.videoId}`
                };
            }
        }
    } catch (error) {
        console.error('YouTube API error:', error.message);
    }
    return null;
}

async function extractArtistFromTitle(title) {
    // Extract artist name from various title formats
    if (title.includes(' - ')) {
        return title.split(' - ')[0].trim();
    } else if (title.includes(' by ')) {
        return title.split(' by ')[1].trim();
    } else if (title.includes(' – ')) { // Different dash
        return title.split(' – ')[0].trim();
    } else {
        // If no clear separator, try to extract first few words as artist
        const words = title.split(' ');
        if (words.length > 1) {
            return words.slice(0, Math.min(3, words.length)).join(' ');
        }
    }
    return null;
}

function getBaseTitle(title) {
    // Remove common tags and normalize
    return title
        .toLowerCase()
        .replace(/\(.*?\)/g, '') // Remove anything in parentheses
        .replace(/\[.*?\]/g, '') // Remove anything in brackets
        .replace(/official|audio|video|lyrics|lyric|feat\.?|ft\.?|remix|hd|mv|visualizer|explicit|clean|\s+/g, ' ')
        .replace(/[^a-z0-9 ]/g, '') // Remove non-alphanumeric
        .trim();
}

async function searchRelatedArtist(artistName, excludeVideoId, lastBaseTitle) {
    try {
        const response = await youtube.search.list({
            key: YOUTUBE_API_KEY,
            part: 'snippet',
            q: `${artistName} music`,
            type: 'video',
            order: 'relevance',
            maxResults: 10
        });

        if (response.data.items && response.data.items.length > 0) {
            // Exclude the current song's video ID and same base title
            const filteredVideos = response.data.items.filter(item => {
                const title = item.snippet.title;
                const baseTitle = getBaseTitle(title);
                const artist = artistName.toLowerCase();
                const videoId = item.id.videoId;
                return (
                    title.toLowerCase().includes(artist) &&
                    videoId !== excludeVideoId &&
                    (!lastBaseTitle || baseTitle !== lastBaseTitle)
                );
            });

            if (filteredVideos.length > 0) {
                const randomVideo = filteredVideos[Math.floor(Math.random() * filteredVideos.length)];
                return {
                    title: randomVideo.snippet.title,
                    url: `https://www.youtube.com/watch?v=${randomVideo.id.videoId}`
                };
            } else {
                // If no filtered results, use any result except the current song and same base title
                const altVideos = response.data.items.filter(item => {
                    const baseTitle = getBaseTitle(item.snippet.title);
                    return item.id.videoId !== excludeVideoId && (!lastBaseTitle || baseTitle !== lastBaseTitle);
                });
                if (altVideos.length > 0) {
                    const randomVideo = altVideos[Math.floor(Math.random() * altVideos.length)];
                    return {
                        title: randomVideo.snippet.title,
                        url: `https://www.youtube.com/watch?v=${randomVideo.id.videoId}`
                    };
                }
            }
        }
    } catch (error) {
        console.error('YouTube API error:', error.message);
    }
    return null;
}

async function searchRandomMusic() {
    // Use different search terms for variety
    const searchTerms = [
        'Olivia Rodrigo',
        'sombr',
        'Coldplay',
        'Neck Deep',
        'Arctic Monkeys',
        'The 1975',
        'The Weeknd',
        'Billie Eilish',
        'Taylor Swift',
        'Ariana Grande',
        'Ed Sheeran',
        'Harry Styles',
    ];

    const randomSearch = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    try {
        const response = await youtube.search.list({
            key: YOUTUBE_API_KEY,
            part: 'snippet',
            q: randomSearch,
            type: 'video',
            order: 'viewCount',
            maxResults: 10
        });

        if (response.data.items && response.data.items.length > 0) {
            const randomVideo = response.data.items[Math.floor(Math.random() * response.data.items.length)];
            return {
                title: randomVideo.snippet.title,
                url: `https://www.youtube.com/watch?v=${randomVideo.id.videoId}`
            };
        }
    } catch (error) {
        console.error('YouTube API error:', error.message);
    }
    return null;
}

async function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
}

async function extractSpotifyTrackId(url) {
    const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

async function getSpotifyTrackInfo(trackId) {
    try {
        const track = await spotifyApi.getTrack(trackId);
        const artist = track.body.artists[0].name;
        const title = track.body.name;
        return `${artist} - ${title}`;
    } catch (error) {
        console.error('Spotify API error:', error);
        return null;
    }
}

async function skipCurrentSong() {
    if (currentPlayer) {
        currentPlayer.stop();
        return true;
    }
    return false;
}

async function getYouTubeVideoDuration(videoId) {
    try {
        const response = await youtube.videos.list({
            key: YOUTUBE_API_KEY,
            part: 'contentDetails',
            id: videoId
        });
        if (response.data.items && response.data.items.length > 0) {
            const durationISO = response.data.items[0].contentDetails.duration;
            // Convert ISO 8601 duration to seconds
            const match = durationISO.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            const hours = parseInt(match[1] || '0', 10);
            const minutes = parseInt(match[2] || '0', 10);
            const seconds = parseInt(match[3] || '0', 10);
            return hours * 3600 + minutes * 60 + seconds;
        }
    } catch (error) {
        console.error('YouTube API error (duration):', error.message);
    }
    return null;
}

async function playSong(guild, song) {
    if (!song) {
        isPlaying = false;
        queue = [];
        return;
    }
    isPlaying = true;
    let stream;
    try {
        console.log('DEBUG about to stream:', song.url);
        stream = await getYouTubeStream(song.url);
    } catch (e) {
        console.error('Error fetching stream:', e);
        queue.shift();
        playSong(guild, queue[0]);
        return;
    }
    const resource = createAudioResource(stream);
    if (!currentPlayer) {
        currentPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
        currentPlayer.on(AudioPlayerStatus.Idle, async () => {
            if (autoplay && !isAutoplaySearching) {
                isAutoplaySearching = true; // Set guard to prevent multiple simultaneous searches
                console.log('DEBUG autoplay: searching for related song to:', song.title);

                // Extract artist from current song
                const artist = await extractArtistFromTitle(song.title);
                const currentVideoId = await extractVideoId(song.url);
                const lastBaseTitle = getBaseTitle(song.title);
                let related = null;
                let duration = null;
                let attempts = 0;
                // Try up to 5 times to find a song under 6 minutes and not a duplicate
                while (attempts < 5) {
                    if (artist) {
                        console.log('DEBUG autoplay: searching for related artist:', artist);
                        related = await searchRelatedArtist(artist, currentVideoId, lastBaseTitle);
                    }
                    if (!related) {
                        console.log('DEBUG autoplay: no related artist found, trying random music');
                        related = await searchRandomMusic();
                    }
                    if (related) {
                        // Check duration
                        const videoId = await extractVideoId(related.url);
                        duration = await getYouTubeVideoDuration(videoId);
                        if (duration !== null && duration <= 360) {
                            break; // Acceptable duration
                        } else {
                            console.log('DEBUG autoplay: song too long, trying another');
                            related = null;
                        }
                    }
                    attempts++;
                }
                if (related) {
                    console.log('DEBUG autoplay: found song:', related.title);
                    queue.push(related);
                    // Send a message to notify users about the autoplay song
                    if (currentTextChannel) {
                        currentTextChannel.send(`🎵 **Autoplay:** Added **${related.title}** to the queue!`);
                    }
                } else {
                    console.log('DEBUG autoplay: no songs found at all');
                }
                isAutoplaySearching = false; // Reset guard after search is complete
            }
            queue.shift();
            playSong(guild, queue[0]);
        });
        currentPlayer.on('error', error => {
            console.error('Audio player error:', error);
            queue.shift();
            playSong(guild, queue[0]);
        });
    }
    currentPlayer.play(resource);
    if (currentConnection) {
        currentConnection.subscribe(currentPlayer);
    }
}

async function searchYouTubeForSpotify(artist, title) {
    const queries = [
        `${artist} - ${title} official audio`,
        `${artist} - ${title} lyrics`,
        `${artist} - ${title} topic`,
        `${artist} - ${title}`,
        `${title} ${artist}`,
        `${title}`
    ];
    for (const query of queries) {
        try {
            const result = await searchYouTube(query);
            if (result) return result;
        } catch (e) {
            // continue to next query
        }
    }
    return null;
}

async function robustSearchYouTube(query) {
    const variants = [
        query,
        query + ' lyrics',
        query + ' official',
        query + ' audio',
        query + ' song',
        query.replace(/friend$/, 'friends'),
        query.replace(/friends$/, 'friend')
    ];
    for (const variant of variants) {
        try {
            const result = await searchYouTube(variant);
            if (result) return result;
        } catch (e) {
            // continue to next variant
        }
    }
    return null;
}

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('You need to be in a voice channel to play music!');
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply('I need permissions to join and speak in your voice channel!');
        }
        const search = args.join(' ');
        if (!search) return message.reply('Please provide a song name or URL.');
        let song = null;

        // Check if it's a Spotify link
        if (search.includes('spotify.com/track/')) {
            const trackId = await extractSpotifyTrackId(search);
            if (trackId) {
                const spotifyInfo = await getSpotifyTrackInfo(trackId);
                if (spotifyInfo) {
                    const [artist, title] = spotifyInfo.split(' - ');
                    song = await searchYouTubeForSpotify(artist, title);
                    if (song) {
                        message.channel.send(`🎵 **Spotify Track:** Found **${spotifyInfo}** on YouTube`);
                    } else {
                        return message.reply('Could not find this Spotify track on YouTube.');
                    }
                } else {
                    return message.reply('Could not get Spotify track information.');
                }
            } else {
                return message.reply('Invalid Spotify track URL.');
            }
        }
        // Check if it's a YouTube URL
        else if (search.includes('youtube.com/watch?v=') || search.includes('youtu.be/')) {
            song = { title: 'YouTube Video', url: search };
        } else {
            try {
                song = await robustSearchYouTube(search);
            } catch (e) {
                return message.reply('No results found.');
            }
        }

        console.log('DEBUG song object:', song);
        if (!song || !song.url) return message.reply('No results found or invalid video URL.');
        queue.push(song);
        message.channel.send(`Added to queue: **${song.title}**`);
        if (!isPlaying) {
            currentChannel = voiceChannel;
            currentConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator
            });
            currentTextChannel = message.channel;
            console.log('DEBUG playSong call:', queue[0]);
            playSong(message.guild, queue[0]);
        }
    }

    if (command === 'skip') {
        if (!isPlaying) {
            return message.reply('No music is currently playing.');
        }

        const skipped = await skipCurrentSong();
        if (skipped) {
            message.channel.send('⏭️ **Skipped** the current song!');
        } else {
            message.reply('Failed to skip the current song.');
        }
    }

    if (command === 'autoplay') {
        if (args[0] === 'on') {
            autoplay = true;
            message.reply('Autoplay is now ON.');
        } else if (args[0] === 'off') {
            autoplay = false;
            message.reply('Autoplay is now OFF.');
        } else {
            message.reply(`Autoplay is currently ${autoplay ? 'ON' : 'OFF'}. Use 'c!autoplay on' or 'c!autoplay off' to change.`);
        }
    }

    if (command === 'insert') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('You need to be in a voice channel to insert music!');
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply('I need permissions to join and speak in your voice channel!');
        }
        const search = args.join(' ');
        if (!search) return message.reply('Please provide a song name or URL.');
        let song = null;

        // Check if it's a Spotify link
        if (search.includes('spotify.com/track/')) {
            const trackId = await extractSpotifyTrackId(search);
            if (trackId) {
                const spotifyInfo = await getSpotifyTrackInfo(trackId);
                if (spotifyInfo) {
                    const [artist, title] = spotifyInfo.split(' - ');
                    song = await searchYouTubeForSpotify(artist, title);
                    if (song) {
                        message.channel.send(`🎵 **Spotify Track:** Found **${spotifyInfo}** on YouTube`);
                    } else {
                        return message.reply('Could not find this Spotify track on YouTube.');
                    }
                } else {
                    return message.reply('Could not get Spotify track information.');
                }
            } else {
                return message.reply('Invalid Spotify track URL.');
            }
        }
        // Check if it's a YouTube URL
        else if (search.includes('youtube.com/watch?v=') || search.includes('youtu.be/')) {
            song = { title: 'YouTube Video', url: search };
        } else {
            try {
                song = await robustSearchYouTube(search);
            } catch (e) {
                return message.reply('No results found.');
            }
        }

        console.log('DEBUG song object (insert):', song);
        if (!song || !song.url) return message.reply('No results found or invalid video URL.');
        // Insert the song right after the current song
        if (queue.length > 0) {
            queue.splice(1, 0, song);
        } else {
            queue.push(song);
        }
        message.channel.send(`Inserted to play next: **${song.title}**`);
        if (!isPlaying) {
            currentChannel = voiceChannel;
            currentConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator
            });
            currentTextChannel = message.channel;
            console.log('DEBUG playSong call (insert):', queue[0]);
            playSong(message.guild, queue[0]);
        }
    }

    if (command === 'help') {
        return message.channel.send(`**Jeruk Music Bot Commands:**\n\n\
\`c!play <song name or link>\` - Play a song from YouTube, Spotify, or search\n\
\`c!insert <song name or link>\` - Insert a song to play next in the queue\n\
\`c!skip\` - Skip the current song\n\
\`c!autoplay on/off\` - Toggle autoplay of related songs\n\
\`c!help\` - Show this help message\n\
**Supported links:** YouTube, Spotify (track), search terms\n`);
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    initializeSpotify();
});

client.login(TOKEN); 