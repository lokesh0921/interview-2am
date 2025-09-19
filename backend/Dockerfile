# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# Install OS deps for tesseract OCR
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001
CMD ["node", "src/index.js"]
