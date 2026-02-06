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
            // const stream = await YouTubeService.getAudioStream(video.url);
            // Dentro do seu PlayCommand.js
            const stream = await YouTubeService.getAudioStream(video.url);

            // Função para converter stream em Buffer
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const audioBuffer = Buffer.concat(chunks);

            // Se o buffer estiver quase vazio (menos de 10kb), houve erro de bloqueio
            if (audioBuffer.length < 10000) {
                throw new Error("O YouTube bloqueou a descarga. Verifique os cookies.");
            }

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