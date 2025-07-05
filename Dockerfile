# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Install FFmpeg, yt-dlp and other dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bot -u 1001

# Change ownership of the app directory
RUN chown -R bot:nodejs /app
USER bot

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the bot
CMD ["node", "index.js"] 