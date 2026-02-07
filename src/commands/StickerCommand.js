// src/commands/StickerCommand.js
const Command = require('../core/Command');
const StickerService = require('../../services/StickerService');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

class StickerCommand extends Command {
    constructor() {
        super('figurinha', 'Cria figurinhas de imagens, vídeos ou frases (use $figurinha e marque uma mídia ou texto)');
    }

    async execute(sock, msg, context) {
        const { remoteJid } = msg.key;
        const messageType = Object.keys(msg.message)[0];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        try {
            let buffer;

            // 1. Caso: Imagem direta com legenda $s
            if (msg.message?.imageMessage) {
                buffer = await this.downloadMedia(msg.message.imageMessage, 'image');
            } 
            // 2. Caso: Marcando uma imagem ou vídeo
            else if (quoted?.imageMessage || quoted?.videoMessage) {
                const media = quoted.imageMessage || quoted.videoMessage;
                const type = quoted.imageMessage ? 'image' : 'video';
                buffer = await this.downloadMedia(media, type);
            }
            // 3. Caso: Marcando um texto (Figurinha de Frase/Quote)
            else if (quoted?.conversation || quoted?.extendedTextMessage) {
                const text = quoted.conversation || quoted.extendedTextMessage.text;
                const participant = msg.message.extendedTextMessage.contextInfo.participant;
                const name = (await sock.groupMetadata(remoteJid)).participants.find(p => p.id === participant)?.notify || "Usuário";
                
                let avatar;
                try {
                    avatar = await sock.profilePictureUrl(participant, 'image');
                } catch {
                    avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name);
                }

                buffer = await StickerService.createQuote(text, avatar, name);
            }

            if (buffer) {
                const sticker = await StickerService.createSticker(buffer);
                await sock.sendMessage(remoteJid, await sticker.toMessage());
            } else {
                await sock.sendMessage(remoteJid, { text: "⚠️ Marque uma imagem, vídeo ou texto para fazer a figurinha!" });
            }

        } catch (e) {
            console.error(e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao criar figurinha. Verifique se a mídia não é muito pesada." });
        }
    }

    async downloadMedia(message, type) {
        const stream = await downloadContentFromMessage(message, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    }
}

module.exports = new StickerCommand();