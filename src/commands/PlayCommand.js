const Command = require('../core/Command');
const YouTubeService = require('../../services/YouTubeService');
const yts = require('yt-search');

class PlayCommand extends Command {
    constructor() {
        super('play', 'Baixa músicas apenas com o nome. Ex: $play Despacito');
    }

    async execute(sock, msg, context, metadata, utils) {

        const { remoteJid } = msg.key;
        const { conteudo } = context;

        if (!conteudo) {
            return await sock.sendMessage(remoteJid, {
                text: "⚠️ Digite o nome da música!"
            });
        }

        try {

            await sock.sendMessage(remoteJid, {
                text: "🔍 Buscando..."
            }, { quoted: msg });

            const r = await yts(conteudo);
            const video = r.videos[0];

            if (!video) {
                return sock.sendMessage(remoteJid, {
                    text: "❌ Música não encontrada."
                });
            }

            if (video.seconds > 600) {
                return sock.sendMessage(remoteJid, {
                    text: "❌ Vídeo muito longo para envio."
                });
            }

            await sock.sendMessage(remoteJid, {
                text: "⬇️ Baixando áudio..."
            });

            const stream = await YouTubeService.getAudioStream(video.url);

            await sock.sendMessage(remoteJid, {
                audio: stream,
                mimetype: 'audio/mp4',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: video.title,
                        body: video.author.name,
                        thumbnailUrl: video.thumbnail,
                        sourceUrl: video.url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

        } catch (e) {

            console.error("Erro no PlayCommand:", e);

            await sock.sendMessage(remoteJid, {
                text: "❌ Serviço temporariamente indisponível."
            });
        }
    }
}

module.exports = new PlayCommand();
