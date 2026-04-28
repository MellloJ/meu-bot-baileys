// src/commands/RevealCommand.js

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const DonoCommandAbstractClass = require('./DonoCommandAbstractClass');

// 🧠 Função recursiva para desempacotar a "Matrioska" do WhatsApp
function extractMediaMessage(msgContent) {
    if (!msgContent) return null;

    // Se achou a mídia na raiz, retorna ela e o tipo
    if (msgContent.imageMessage) return { type: 'image', data: msgContent.imageMessage };
    if (msgContent.videoMessage) return { type: 'video', data: msgContent.videoMessage };

    // Lista de "cascas" que o WhatsApp usa para esconder a mídia
    const wrappers = [
        'viewOnceMessageV2', 
        'viewOnceMessage', 
        'viewOnceMessageV2Extension', 
        'ephemeralMessage', 
        'documentWithCaptionMessage'
    ];

    // Procura dentro das cascas recursivamente
    for (const wrapper of wrappers) {
        if (msgContent[wrapper]?.message) {
            return extractMediaMessage(msgContent[wrapper].message); // Chama a si mesma para a próxima camada
        }
    }

    return null;
}

class RevealCommand extends DonoCommandAbstractClass {
    constructor() {
        super('revelar', 'Revela vídeos e imagens de visualização única.');
    }

    async handleDono(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted) return sock.sendMessage(remoteJid, { text: "⚠️ Marque um vídeo ou imagem de visualização única!" });

        try {
            // 1. EXTRAÇÃO INTELIGENTE (O Fim do Erro da Media Key)
            const mediaInfo = extractMediaMessage(quoted);

            if (!mediaInfo) {
                return sock.sendMessage(remoteJid, { text: "❌ Não encontrei nenhuma mídia válida e revelável nessa mensagem." });
            }

            const mediaData = mediaInfo.data;
            const type = mediaInfo.type;

            // 🛡️ TRAVA DE SEGURANÇA: Se a chave realmente não existir, barra antes de quebrar a aplicação
            if (!mediaData.mediaKey) {
                return sock.sendMessage(remoteJid, { text: "❌ O WhatsApp não forneceu a chave (mediaKey) de descriptografia. Isso pode acontecer se a mensagem for antiga ou o Baileys não tiver interceptado a chave a tempo." });
            }

            await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } });

            // 2. DOWNLOAD DO CONTEÚDO
            const stream = await downloadContentFromMessage(mediaData, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 3. ENVIO DA MÍDIA REVELADA
            const options = {
                caption: `🔓 *Mídia Revelada*`,
                mimetype: mediaData.mimetype,
                jpegThumbnail: null // Excelente prática para servidores Linux
            };

            if (type === 'video') {
                await sock.sendMessage(remoteJid, { video: buffer, ...options }, { quoted: msg });
            } else {
                await sock.sendMessage(remoteJid, { image: buffer, ...options }, { quoted: msg });
            }

            await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.error("[Reveal Error]", e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao processar mídia: " + e.message });
        }
    }
}

module.exports = new RevealCommand();