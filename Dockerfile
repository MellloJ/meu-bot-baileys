FROM node:22

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip3 install yt-dlp

# Criar pasta da aplicação
WORKDIR /app

# Copiar package.json primeiro (melhora cache)
COPY package*.json ./

# Instalar dependências node
RUN npm install

# Copiar resto do projeto
COPY . .

# Porta padrão (ajuste se seu bot usar outra)
EXPOSE 3000

# Comando inicial
CMD ["npm", "start"]
