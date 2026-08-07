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

# Run as the unprivileged built-in `node` user, not root.
USER node

HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5003)+'/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "backend/src/server.js"]
