const play = require('play-dl');
const initYoutubeAuth = require('../src/settings/youtubeAuth');

class YouTubeService {

    async getAudioStream(url) {
        await initYoutubeAuth();

        try {
            console.log("[YouTube] Obtendo stream...");

            const stream = await play.stream(url, {
                quality: 2
            });

            return stream.stream;

        } catch (error) {
            console.error("[YouTube] Erro ao obter stream:", error.message);
            throw new Error("Não consegui obter o áudio do vídeo.");
        }
    }
}

module.exports = new YouTubeService();
