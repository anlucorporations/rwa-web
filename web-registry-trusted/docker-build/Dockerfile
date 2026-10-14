FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000





# Copiamos el contenido de standalone
COPY standalone/ .

# Exponemos el puerto para Traefik
EXPOSE 3000

# Arrancamos directamente con Node
CMD ["node", "server.js"]
