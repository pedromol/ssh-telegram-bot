FROM docker.io/node:16-alpine

COPY . /srv
WORKDIR /srv

RUN npm i -g npm
RUN npm i

ENTRYPOINT ["npm", "start"]
