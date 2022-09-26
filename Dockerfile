FROM ubuntu:20.04

#Add a user with name nonroot
RUN useradd -ms /bin/bash nonroot

# 80 = HTTP, 443 = HTTPS, 3000 = MEAN.JS server, 35729 = livereload, 8080 = node-inspector
EXPOSE 80 443 3000 35729 8080

# Set development environment as default
ENV NODE_ENV development

ARG DEBIAN_FRONTEND=noninteractive

# Install Utilities
RUN apt-get update -q  \
 && apt-get install -yqq \
 curl \
 git \
 ssh \
 gcc \
 make \
 build-essential \
 libkrb5-dev \
 sudo \
 apt-utils \
 apt-transport-https

# Add the yarn repo to the package list
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

# Install nodejs
RUN curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
RUN sudo apt-get install -yq nodejs
RUN sudo apt-get install -yq yarn
RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install MEAN.JS Prerequisites
RUN npm install --quiet -g grunt mocha pm2

RUN mkdir -p /opt/node_app/app/public/lib
WORKDIR /opt/node_app

# Copies the local package.json file to the container
# and utilities docker container cache to not needing to rebuild
# and install node_modules/ everytime we build the docker, but only
# when the local package.json file changes.
# Install npm packages
COPY package.json yarn.lock ./
RUN yarn install --ignore-optional && yarn cache clean
ENV PATH /opt/app/node_modules/.bin:$PATH

# check every 30s to ensure this service returns HTTP 200
HEALTHCHECK --interval=30s CMD node healthcheck.js

WORKDIR /opt/node_app/app

COPY . .

ENTRYPOINT ["./docker-entrypoint.sh"]

CMD pm2 start --no-daemon processes.json

#Run Container as nonroot
#USER nonroot

STOPSIGNAL SIGINT