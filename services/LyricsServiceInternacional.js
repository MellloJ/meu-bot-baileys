// src/services/LyricsService.js
const axios = require('axios');
const yts = require('yt-search');

class LyricsService {
    async buscarLetra(termo) {
        try {
            // 1. Pesquisa no YouTube para garantir que temos o nome correto da música/artista
            const r = await yts(termo);
            const video = r.videos[0];
            if (!video) return null;

            // 2. Tenta a LRCLIB (API extremamente estável e recomendada em fóruns atuais)
            // Ela permite busca por 'track_name' e 'artist_name'
            const url = `https://lrclib.net/api/search?q=${encodeURIComponent(video.title)}`;
            
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Bot de WhatsApp)' },
                timeout: 5000
            });

            // A LRCLIB retorna um array. Vamos pegar o primeiro resultado que tenha letra.
            const musicaEncontrada = data.find(m => m.plainLyrics || m.syncedLyrics);

            if (musicaEncontrada) {
                return {
                    titulo: musicaEncontrada.trackName,
                    artista: musicaEncontrada.artistName,
                    letra: musicaEncontrada.plainLyrics || "Letra sincronizada disponível, mas sem texto puro.",
                    imagem: video.thumbnail
                };
            }

            // Fallback: Se não achar na LRCLIB, tenta uma busca bruta pelo título no endpoint de 'get'
            return null;
        } catch (error) {
            console.error("[LyricsService] Erro na LRCLIB:", error.message);
            return null;
        }
    }
}

module.exports = new LyricsService();