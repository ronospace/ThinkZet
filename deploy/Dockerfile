# ThinkZet - zero dependencies, so the image is just Node plus the source.
FROM node:22-slim

ENV NODE_ENV=production \
    PORT=4173 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data

WORKDIR /app

# Only the source is needed: no npm install, no build step.
COPY app ./app
COPY scripts ./scripts
COPY deploy/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && mkdir -p /app/data

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4173)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Starts as root so the mounted volume can be chowned, then drops to node.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "app/server.cjs"]
