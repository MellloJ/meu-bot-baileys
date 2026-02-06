// commands/PlayCommand.js
const Command = require('../core/Command');
// const yt = require('../../services/YouTubeService');
// const lyrics = require('../../services/LyricsService');

const YouTubeService = require('../services/YouTubeService');
const yts = require('yt-search');

class PlayCommand extends Command {
    constructor() {
        super('play', 'Busca e envia música com letra e capa');
    }

    async execute(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        const { conteudo } = context;

        try {
            // 1. Busca o vídeo
            const r = await yts(conteudo);
            const video = r.videos[0];
            if (!video) return sock.sendMessage(remoteJid, { text: "❌ Vídeo não encontrado." });

            await sock.sendMessage(remoteJid, { text: `⏳ Processando: *${video.title}*...` });

            // 2. Obtém o Stream de áudio
            const stream = await YouTubeService.getAudioStream(video.url);

            if (!stream) throw new Error("Não foi possível gerar o stream.");

            // 3. Envia diretamente para o WhatsApp
            // O Render não sofre aqui pois o arquivo não é salvo no disco
            await sock.sendMessage(remoteJid, {
                audio: { stream },
                mimetype: 'audio/mp4',
                ptt: false // mude para true se quiser que envie como "gravando áudio"
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao processar áudio. Tente novamente." });
        }
    }
}
module.exports = new PlayCommand();