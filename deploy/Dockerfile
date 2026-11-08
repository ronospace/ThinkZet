# ThinkZet - zero dependencies, so the image is just Node plus the source.
FROM node:22-slim

ENV NODE_ENV=production \
    PORT=4173 \
    HOST=0.0.0.0

WORKDIR /app

# Only the source is needed: no npm install, no build step.
COPY app ./app
COPY scripts ./scripts

# The database lives on a mounted volume, not in the image.
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4173)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "app/server.cjs"]
