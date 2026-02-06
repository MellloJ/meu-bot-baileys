// src/services/YouTubeService.js
const ytDlp = require('yt-dlp-exec');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');

class YouTubeService {
    async getAudioStream(url) {
        try {
            // Caminho para o seu arquivo de cookies
            const cookiesPath = path.join(__dirname, '../src/cookies.txt');

            const subprocess = ytDlp.exec(url, {
                extractAudio: true,
                audioFormat: 'mp3',
                output: '-',
                ffmpegLocation: ffmpegPath,
                // SOLUÇÃO DOS ERROS:
                cookies: cookiesPath, // Passa o arquivo de cookies
                jsOptions: 'node',     // Resolve o aviso de JavaScript runtime
                addHeader: [
                    'referer:https://www.youtube.com/',
                    'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                ]
            }, { stdio: ['ignore', 'pipe', 'pipe'] });

            subprocess.stderr.on('data', (data) => console.log(`[yt-dlp-debug]: ${data}`));

            return subprocess.stdout; 
        } catch (error) {
            console.error("Erro no YouTubeService:", error.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();