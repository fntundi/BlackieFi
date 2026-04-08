FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY services/gateway-app/package.json ./

RUN npm install

COPY services/gateway-app/tsconfig.json ./
COPY services/gateway-app/src ./src

RUN npm run build

EXPOSE 8000

CMD ["node", "dist/index.js"]
