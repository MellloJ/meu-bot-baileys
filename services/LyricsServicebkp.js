// src/services/LyricsService.js
const axios = require('axios');
const yts = require('yt-search');

class LyricsService {
    async buscarLetra(termo) {
        try {
            // 1. Achar o nome exato via YouTube
            const r = await yts(termo);
            const video = r.videos[0];
            if (!video) return null;

            // 2. Usar a API do Vagalume (Estabilidade máxima)
            // Documentação: api.vagalume.com.br
            const url = `https://api.vagalume.com.br/search.php?art=${encodeURIComponent(video.author.name)}&mus=${encodeURIComponent(video.title)}&apikey=6677bc2f004f128c946f6f96614144e5`;
            
            const { data } = await axios.get(url, { timeout: 6000 });

            if (data.type === 'exact' || data.type === 'aprox') {
                const musica = data.mus[0];
                return {
                    titulo: musica.name,
                    artista: data.art.name,
                    letra: musica.text,
                    imagem: video.thumbnail
                };
            }

            return null;
        } catch (error) {
            console.error("[LyricsService] Erro:", error.message);
            return null;
        }
    }
}

module.exports = new LyricsService();