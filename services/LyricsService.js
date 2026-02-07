// src/services/LyricsService.js
const axios = require('axios');
const yts = require('yt-search');
const { translate } = require('google-translate-api-x');

class LyricsService {
    async buscarLetra(termo) {
        try {
            const r = await yts(termo);
            const video = r.videos[0];
            if (!video) return null;

            const tituloLimpo = video.title
                .replace(/\(Official.*\)|\[Official.*\]|video oficial|clipe oficial/gi, '')
                .trim();

            const url = `https://lyrist.vercel.app/api/${encodeURIComponent(tituloLimpo)}`;
            const { data } = await axios.get(url);

            if (data && data.lyrics) {
                // Tradução automática se não for PT
                let letraTraduzida = null;
                try {
                    const resTraducao = await translate(data.lyrics, { to: 'pt' });
                    // Só salvamos se o idioma de origem não for português
                    if (resTraducao.from.language.iso !== 'pt') {
                        letraTraduzida = resTraducao.text;
                    }
                } catch (err) {
                    console.error("[Lyrics] Falha na tradução:", err.message);
                }

                return {
                    titulo: data.title || video.title,
                    artista: data.artist || video.author.name,
                    letraOriginal: data.lyrics,
                    letraTraduzida: letraTraduzida,
                    imagem: data.image || video.thumbnail
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