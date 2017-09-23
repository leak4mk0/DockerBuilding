FROM node:8-alpine

LABEL maintainer="leak4mk0 <leak4mk0@gmail.com>"

ENV NODE_ENV=production

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD ./package.json ./npm-shrinkwrap.json /usr/src/app/
RUN npm install 2>&1

ADD ./ /usr/src/app/

EXPOSE 8080
ENTRYPOINT ["npm", "start"]
