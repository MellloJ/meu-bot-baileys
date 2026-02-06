// src/commands/PlayCommand.js
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
            return await sock.sendMessage(remoteJid, { text: "⚠️ Digite o nome da música!" });
        }

        try {
            await sock.sendMessage(remoteJid, { text: "🔍 Buscando..." }, { quoted: msg });

            // 1. Busca o vídeo no YouTube (apenas para pegar a URL correta)
            const r = await yts(conteudo);
            const video = r.videos[0];

            if (!video) return sock.sendMessage(remoteJid, { text: "❌ Música não encontrada." });

            if (video.seconds > 600) {
                return await sock.sendMessage(remoteJid, { text: "❌ Vídeo muito longo para envio." });
            }

            // 2. Pede para a API externa gerar o link de download
            console.log(`[PLAY] Gerando link para: ${video.title}`);
            const downloadUrl = await YouTubeService.getDownloadUrl(video.url);

            if (!downloadUrl) {
                throw new Error("Falha na API externa. Tente novamente.");
            }

            // 3. Baixa o arquivo real para enviar
            const audioBuffer = await YouTubeService.getAudioBuffer(downloadUrl);

            if (!audioBuffer) throw new Error("Falha ao baixar o arquivo de áudio.");

            // 4. Envia
            await sock.sendMessage(remoteJid, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: false,
                // Opcional: Adiciona metadados visuais (capa)
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
            await sock.sendMessage(remoteJid, { text: "❌ Serviço temporariamente indisponível. Tente mais tarde." });
        }
    }
}

module.exports = new PlayCommand();