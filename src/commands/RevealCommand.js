const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const DonoCommandAbstractClass = require('./DonoCommandAbstractClass');

class RevealCommand extends DonoCommandAbstractClass {
    constructor() {
        super('revelar', 'Revela vídeos e imagens de visualização única.');
    }

    async handleDono(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted) return sock.sendMessage(remoteJid, { text: "⚠️ Marque um vídeo ou imagem de visualização única!" });

        try {
            // 1. EXTRAÇÃO DIRETA (Baseada no seu Debug)
            // Tentamos pegar o vídeo ou imagem, não importa onde estejam
            const video = quoted.videoMessage || quoted.viewOnceMessageV2?.message?.videoMessage || quoted.viewOnceMessage?.message?.videoMessage;
            const image = quoted.imageMessage || quoted.viewOnceMessageV2?.message?.imageMessage || quoted.viewOnceMessage?.message?.imageMessage;
            
            const mediaData = video || image;
            const type = video ? 'video' : 'image';

            if (!mediaData) {
                return sock.sendMessage(remoteJid, { text: "❌ Não encontrei mídia neste formato." });
            }

            // O Erro "empty media key" acontece aqui se mediaData for passado incompleto.
            // Vamos garantir que ele tenha o que precisa.
            if (!mediaData.mediaKey && !quoted.mediaKey) {
                // Tentativa de recuperação: em algumas versões a key fica no topo
                mediaData.mediaKey = quoted.mediaKey; 
            }

            await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } });

            // 2. DOWNLOAD DO CONTEÚDO
            // Passamos o objeto mediaData (que contém a url, fileSha, etc)
            const stream = await downloadContentFromMessage(mediaData, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 3. ENVIO DA MÍDIA REVELADA
            const options = {
                caption: `🔓 *Mídia Revelada*`,
                mimetype: mediaData.mimetype,
                jpegThumbnail: null // Remove processamento de imagem que trava no Linux
            };

            if (type === 'video') {
                await sock.sendMessage(remoteJid, { video: buffer, ...options }, { quoted: msg });
            } else {
                await sock.sendMessage(remoteJid, { image: buffer, ...options }, { quoted: msg });
            }

            await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.error("[Reveal Error]", e);
            // Se o erro for a media key vazia, avisamos o usuário de forma clara
            if (e.message.includes('media key')) {
                await sock.sendMessage(remoteJid, { text: "❌ Erro de Criptografia: O WhatsApp não forneceu a chave desta mídia. Tente abrir a mídia no celular antes de usar o comando." });
            } else {
                await sock.sendMessage(remoteJid, { text: "❌ Erro ao processar mídia: " + e.message });
            }
        }
    }
}

module.exports = new RevealCommand();