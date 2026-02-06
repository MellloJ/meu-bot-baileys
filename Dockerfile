FROM node:22

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Criar ambiente virtual Python
RUN python3 -m venv /opt/venv

# Adicionar venv no PATH
ENV PATH="/opt/venv/bin:$PATH"

# Instalar yt-dlp dentro do venv
RUN pip install yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
