FROM node:18.8-alpine as builder

WORKDIR /home/node
COPY package*.json ./

COPY . .

RUN yarn install
RUN yarn build

FROM node:18.8-alpine as runtime

ENV NODE_ENV=production
ENV PAYLOAD_CONFIG_PATH=dist/payload.config.js

WORKDIR /home/node
COPY package*.json ./

RUN yarn install

COPY --from=builder /home/node/dist ./dist
COPY --from=builder /home/node/build ./build

EXPOSE 3000

CMD ["node", "./dist/server.js"]
