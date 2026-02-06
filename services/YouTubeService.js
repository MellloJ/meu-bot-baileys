// src/services/YouTubeService.js
const axios = require('axios');

class YouTubeService {
    async getDownloadUrl(url) {
        try {
            // Cobalt é uma API excelente para baixar mídia sem dor de cabeça
            const response = await axios.post('https://cobalt.api.kwiatekmiki.pl/api/json', {
                url: url,
                vCodec: "h264",
                vQuality: "720",
                aFormat: "mp3",
                isAudioOnly: true
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            // A API pode retornar o link em 'url' ou 'picker' dependendo do caso
            if (response.data?.url) {
                return response.data.url;
            } else if (response.data?.picker && response.data.picker.length > 0) {
                return response.data.picker[0].url;
            }

            throw new Error("API não retornou link de áudio.");
        } catch (error) {
            console.error("Erro na API Cobalt:", error.message);
            return null;
        }
    }

    // Função auxiliar para baixar o arquivo do link gerado e converter em Buffer
    async getAudioBuffer(downloadUrl) {
        try {
            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer'
            });
            return Buffer.from(response.data);
        } catch (error) {
            console.error("Erro ao baixar o buffer do áudio:", error.message);
            return null;
        }
    }
}

module.exports = new YouTubeService();