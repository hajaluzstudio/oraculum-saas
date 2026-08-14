# ==============================================================================
# DOCKERFILE - ORACULUM SAAS MARKETING HÍBRIDO ROI-FIRST
# Node 20 LTS Alpine Image
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copia dependências do package.json
COPY package*.json ./
RUN npm install

# Copia código-fonte e compila com esbuild
COPY . .
RUN node node_modules/esbuild/bin/esbuild src/server.ts --bundle --platform=node --target=node20 --outfile=dist/server.js

# Stage de Produção Leve
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Copia os artefatos compilados e arquivos públicos
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/data_storage ./data_storage

# Instala apenas dependências essenciais de produção
RUN npm install --omit=dev

EXPOSE 4000

CMD ["node", "dist/server.js"]
