FROM node:10

# Install yarn
RUN npm install -g yarn

RUN mkdir /app

WORKDIR /app
COPY . .
# Uncomment this line and add an .npmrc file with a token to allow
# private npm modules to be pulled into the image
# COPY utils/.npmrc /app/task-runner-template/.npmrc
RUN yarn deploy

CMD pm2-docker build/src/index.js
