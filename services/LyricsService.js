// src/services/LyricsService.js
const axios = require('axios');
const yts = require('yt-search');

class LyricsService {
    async buscarLetra(termo) {
        try {
            // 1. Busca no YouTube para validar o nome da música
            const r = await yts(termo);
            const video = r.videos[0];
            if (!video) return null;

            const tituloBusca = video.title.replace(/\(Official.*\)|\[Official.*\]/gi, '').trim();
            const artistaBusca = video.author.name;

            // --- TENTATIVA 1: Vagalume (API Brasileira, mais estável) ---
            try {
                const urlVagalume = `https://api.vagalume.com.br/search.php?art=${encodeURIComponent(artistaBusca)}&mus=${encodeURIComponent(tituloBusca)}&apikey=6677bc2f004f128c946f6f96614144e5`;
                const resVag = await axios.get(urlVagalume, { timeout: 4000 });
                
                if (resVag.data && (resVag.data.type === 'exact' || resVag.data.type === 'aprox')) {
                    return {
                        titulo: resVag.data.mus[0].name,
                        artista: resVag.data.art.name,
                        letra: resVag.data.mus[0].text,
                        imagem: video.thumbnail
                    };
                }
            } catch (err) {
                console.warn("[Lyrics] Vagalume falhou ou deu timeout, tentando Backup...");
            }

            // --- TENTATIVA 2: PopCat (Backup Internacional) ---
            try {
                const urlPop = `https://api.popcat.xyz/lyrics?song=${encodeURIComponent(tituloBusca)}`;
                const resPop = await axios.get(urlPop, { timeout: 4000 });
                
                if (resPop.data && resPop.data.lyrics) {
                    return {
                        titulo: resPop.data.title,
                        artista: resPop.data.artist,
                        letra: resPop.data.lyrics,
                        imagem: resPop.data.image || video.thumbnail
                    };
                }
            } catch (err) {
                console.error("[Lyrics] Backup também falhou.");
            }

            return null;
        } catch (error) {
            console.error("[LyricsService] Erro geral:", error.message);
            return null;
        }
    }
}

module.exports = new LyricsService();