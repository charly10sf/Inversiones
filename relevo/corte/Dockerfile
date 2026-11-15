# El corte del gasto del relevo para Cloud Run: Node 22 sin dependencias (solo servidor.mjs)
FROM node:22-alpine
WORKDIR /app
COPY package.json servidor.mjs ./
ENV NODE_ENV=production
USER node
CMD ["node", "servidor.mjs"]
