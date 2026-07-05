FROM node:20-alpine

WORKDIR /app

# Backend
COPY backend/package*.json backend/
RUN cd backend && npm ci --omit=dev

# Frontend build
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Backend source
COPY backend/ backend/

ENV NODE_ENV=production
EXPOSE 5003
CMD ["node", "backend/src/server.js"]
