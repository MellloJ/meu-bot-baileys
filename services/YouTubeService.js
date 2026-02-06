// src/services/YouTubeService.js
const ytdl = require('@distube/ytdl-core');

class YouTubeService {
    async getAudioStream(url) {
        try {
            // Verifica se a URL é válida antes de processar
            if (!ytdl.validateURL(url)) {
                throw new Error("URL do YouTube inválida.");
            }

            // O pulo do gato para o Render: 
            // Pedimos apenas o áudio com a menor qualidade aceitável (128kbps)
            // para economizar RAM e CPU.
            return ytdl(url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25 // Buffer de 32MB para evitar quedas no stream
            });
        } catch (error) {
            console.error("Erro no YouTubeService:", error.message);
            return null;
        }
    }

    async getInfo(url) {
        return await ytdl.getBasicInfo(url);
    }
}

module.exports = new YouTubeService();