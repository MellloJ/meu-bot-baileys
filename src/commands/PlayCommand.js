const Command = require('../core/Command');
const AudioDownloader = require('../../services/AudioDownloader');
const yts = require('yt-search');

class PlayCommand extends Command {

    constructor() {
        super('play', 'Baixa músicas pelo nome');
    }

    async execute(sock, msg, context) {

        const { remoteJid } = msg.key;
        const { conteudo } = context;

        if (!conteudo) {
            return sock.sendMessage(remoteJid, {
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
                    text: "❌ Vídeo muito longo."
                });
            }

            await sock.sendMessage(remoteJid, {
                text: "⬇️ Baixando áudio..."
            });

            const stream = await AudioDownloader.getAudioStream(video.url);

            await sock.sendMessage(remoteJid, {
                audio: stream,
                mimetype: 'audio/ogg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: video.title,
                        body: video.author.name,
                        thumbnailUrl: video.thumbnail,
                        sourceUrl: video.url,
                        mediaType: 1
                    }
                }
            }, { quoted: msg });

        } catch (error) {

            console.error("[PlayCommand]", error);

            await sock.sendMessage(remoteJid, {
                text: "❌ Não consegui baixar essa música agora."
            });
        }
    }
}

module.exports = new PlayCommand();
