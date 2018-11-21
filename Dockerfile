FROM node:10

# Install pm2
RUN yarn global add pm2@latest

RUN mkdir /app

WORKDIR /app
COPY . .
# Uncomment this line and add an .npmrc file with a token
# to the private-configs directory to allow
# private npm modules to be pulled into the image
# currently all private modules must come from the same scope
# COPY private-configs/.npmrc /app/task-runner-template/.npmrc
RUN yarn deploy

CMD pm2-docker build/src/index.js
