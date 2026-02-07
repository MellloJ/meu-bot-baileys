# Usamos a versão 'slim' para ser mais leve e rápida no build
FROM node:20-slim

# Instalamos as dependências básicas de sistema
# ca-certificates é essencial para o curl não dar erro de SSL
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Baixamos o yt-dlp diretamente e damos permissão de execução
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Definimos o diretório de trabalho
WORKDIR /app

# Copiamos apenas os arquivos de dependências primeiro (otimiza o cache do Docker)
COPY package*.json ./
RUN npm install --production

# Copiamos o resto dos arquivos do bot
COPY . .

# Comando para iniciar o bot
CMD ["node", "src/index.js"]