FROM node:6-alpine

MAINTAINER leak4mk0 <leak4mk0@gmail.com>

ENV NODE_ENV=production

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD ./package.json /usr/src/app
RUN npm install

ADD ./ /usr/src/app

EXPOSE 8080
ENTRYPOINT ["npm", "start"]
