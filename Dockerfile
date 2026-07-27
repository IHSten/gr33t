FROM docker.io/library/node:24-slim

WORKDIR /app

RUN npm install -g npm@11.17.0

COPY package.json package-lock.json .npmrc ./
RUN npm install

COPY . .

ENTRYPOINT ["/app/scripts/docker-dev-entrypoint.sh"]

EXPOSE 8787 5173
