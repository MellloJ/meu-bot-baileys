// src/services/YouTubeService.js
const ytdl = require('@distube/ytdl-core');

class YouTubeService {
    async getAudioStream(url) {
        try {
            // Pega o cookie das variáveis de ambiente
            const cookie = process.env.YT_COOKIE;

            const options = {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
                requestOptions: {
                    headers: {
                        // O segredo está aqui: passar o cookie e um User-Agent real
                        'Cookie': cookie,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }
            };

            return ytdl(url, options);
        } catch (error) {
            console.error("Erro no YouTubeService:", error.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();