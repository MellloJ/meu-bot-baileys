// commands/PlayCommand.js
const Command = require('../core/Command');
// const yt = require('../../services/YouTubeService');
// const lyrics = require('../../services/LyricsService');

const YouTubeService = require('../../services/YouTubeService');
const yts = require('yt-search');

const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

class PlayCommand extends Command {
    constructor() {
        super('play', 'Busca e envia música com letra e capa');
    }

    async execute(sock, msg, context, metadata, utils) {
        
        const { remoteJid } = msg.key;
        const { conteudo } = context;

        if (!conteudo) {
            return await sock.sendMessage(remoteJid, { text: "⚠️ Digite o nome da música! Ex: *$play Linkin Park*" });
        }

        try {
            console.log(`[PLAY] Iniciando busca para: ${conteudo}`);
            await sock.sendMessage(remoteJid, { text: "🔍 Buscando música e preparando áudio..." }, { quoted: msg });

            // 1. Busca o vídeo
            const r = await yts(conteudo);
            const video = r.videos[0];

            if (!video) {
                return await sock.sendMessage(remoteJid, { text: "❌ Não encontrei nenhum vídeo com esse nome." });
            }

            // 2. Valida duração
            if (video.seconds > 600) {
                return await sock.sendMessage(remoteJid, { text: "❌ O vídeo é muito longo (máximo 10 min)." });
            }

            console.log(`[PLAY] Vídeo encontrado: ${video.title}. Solicitando stream...`);

            // 3. Obtém o Stream
            // const stream = await YouTubeService.getAudioStream(video.url);
            const stream = await YouTubeService.getAudioStream(video.url);

            if (!stream) throw new Error("Falha ao iniciar stream.");

            // if (!stream) {
            //     throw new Error("O YouTubeService retornou um stream vazio ou nulo.");
            // }

            // 1. Convertemos o stream em Buffer (mais estável para o WhatsApp)
            const audioBuffer = await streamToBuffer(stream);

            // 4. Envia para o WhatsApp (Apenas UMA vez)
            await sock.sendMessage(remoteJid, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: false
            }, { quoted: msg });

            console.log(`[PLAY] Áudio enviado com sucesso para ${remoteJid}`);

        } catch (e) {
            console.error("Erro no PlayCommand:", e);
            await sock.sendMessage(remoteJid, { text: `❌ Erro: ${e.message}` });
        }
    }
}
module.exports = new PlayCommand();