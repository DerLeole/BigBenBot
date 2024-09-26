# Stage 1: Build stage
FROM node:18-alpine AS build

# Install Python and other dependencies (if necessary)
RUN apk add --no-cache alpine-sdk python3

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the application files to the working directory
COPY bot.js ./
COPY bell.mp3 ./

# Stage 2: Production stage
FROM node:18-alpine

# Install Python in the final production image
RUN apk add --no-cache python3

# Set working directory for production container
WORKDIR /usr/src/app

# Copy the necessary files from the build stage
COPY --from=build /usr/src/app ./

# Expose the port (if your app uses one, adjust if needed)
# EXPOSE 3000

# Command to run the application
CMD ["node", "bot.js"]