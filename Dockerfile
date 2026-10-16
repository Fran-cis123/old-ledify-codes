FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice-impress libreoffice-writer poppler-utils \
        fonts-liberation fonts-dejavu-core fontconfig ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
RUN chown -R node:node /app

ENV NODE_ENV=production \
    LIBREOFFICE_PATH=/usr/bin/libreoffice \
    PDFTOPPM_PATH=/usr/bin/pdftoppm
USER node
EXPOSE 5000
CMD ["npm", "start"]
