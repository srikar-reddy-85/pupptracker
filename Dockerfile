# # Use an official Node runtime as the base image
# FROM node:18.17.1

# # We don't need the standalone Chromium
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# # Install Google Chrome Stable and fonts
# # Note: this installs the necessary libs to make the browser work with Puppeteer.
# RUN apt-get update && apt-get install curl gnupg -y \
#     && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
#     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
#     && apt-get update \
#     && apt-get install google-chrome-stable -y --no-install-recommends \
#     && rm -rf /var/lib/apt/lists/*

# # Set the working directory in the container
# WORKDIR /usr/src/pupptracker_v_01

# # Copy package.json and package-lock.json
# COPY package*.json ./

# # Install the application dependencies
# RUN npm install

# # Copy the application code
# COPY server.js ./

# # Copy data files
# COPY data.txt selectedItems.json ./

# # Make port 3000 available outside the container
# EXPOSE 3000

# # Define the command to run the app
# CMD [ "node", "server.js" ]

# Use an official Node runtime as the base image
FROM node:18.17.1

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install curl gnupg -y \
    && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install google-chrome-stable -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser

# Set the working directory in the container
WORKDIR /usr/src/pupptracker_v_01

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the application code
COPY server.js ./

# Copy data files
COPY data.txt selectedItems.json ./

# Change ownership of the working directory to pptruser
RUN chown -R pptruser:pptruser /usr/src/pupptracker_v_01

# Switch to pptruser
USER pptruser

# Make port 3000 available outside the container
EXPOSE 3000

# Define the command to run the app
CMD [ "node", "server.js" ]