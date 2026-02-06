// src/services/YouTubeService.js
const ytDlp = require('yt-dlp-exec');
const ffmpegPath = require('ffmpeg-static');

class YouTubeService {
    async getAudioStream(url) {
        try {
            const subprocess = ytDlp.exec(url, {
                extractAudio: true,
                audioFormat: 'mp3', // MP3 é mais aceito universalmente no Baileys para conversão
                output: '-',
                ffmpegLocation: ffmpegPath,
                // Adicionamos argumentos para garantir que o stream seja contínuo
                addHeader: [
                    'referer:https://www.youtube.com/',
                    'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                ]
            }, { stdio: ['ignore', 'pipe', 'pipe'] }); // Capturamos o erro também para debug

            // Se houver erro no processo do yt-dlp, logamos
            subprocess.stderr.on('data', (data) => console.log(`[yt-dlp-stderr]: ${data}`));

            return subprocess.stdout; 
        } catch (error) {
            console.error("Erro no YouTubeService:", error.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();