FROM node:14

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm i --production

COPY . .
CMD ["npm", "run", "prod"]
