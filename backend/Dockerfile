FROM node:20-slim

# better-sqlite3 needs build tools to compile its native binding
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# Mount a volume here in production so the SQLite DB and the PDF survive redeploys
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 4000
CMD ["node", "src/server.js"]
