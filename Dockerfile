FROM node:10.16.3

# Create app directory
WORKDIR /usr/src/nodred-power

COPY package.json .
COPY nodered-power.js .

EXPOSE 8200
CMD [ "node", "nodered-power.js" ] 
