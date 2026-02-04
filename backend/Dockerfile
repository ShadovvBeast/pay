# Use Bun image
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Start the application
CMD ["bun", "run", "index.ts"]
