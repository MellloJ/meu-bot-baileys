const AdminCommands = require("./AdminCommands");
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

class HidetagCommand extends AdminCommands {
    constructor() {
        super('hidetag', 'Marca todos do grupo na mensagem atual ou na marcada.');
    }

    async handleAdmin(sock, msg, context, metadata) {
        const { remoteJid } = msg.key;
        const { mensagem } = context; // Texto digitado após o comando
        
        try {
            // 1. Coleta todos os IDs dos participantes
            const grupo = await sock.groupMetadata(remoteJid);
            const ids = grupo.participants.map(p => p.id);

            // 2. Verifica se há uma mensagem marcada (quoted)
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            // CASO 1: Há uma imagem marcada
            if (quoted?.imageMessage) {
                const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                return await sock.sendMessage(remoteJid, {
                    image: buffer,
                    caption: mensagem || quoted.imageMessage.caption || "",
                    mentions: ids
                });
            }

            // CASO 2: Há um vídeo marcado
            if (quoted?.videoMessage) {
                const stream = await downloadContentFromMessage(quoted.videoMessage, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                return await sock.sendMessage(remoteJid, {
                    video: buffer,
                    caption: mensagem || quoted.videoMessage.caption || "",
                    mentions: ids
                });
            }

            // CASO 3: Há um texto marcado ou apenas texto direto
            let textoFinal = mensagem; // Prioridade para o que o user digitou agora

            if (!textoFinal && quoted?.conversation) {
                textoFinal = quoted.conversation;
            } else if (!textoFinal && quoted?.extendedTextMessage?.text) {
                textoFinal = quoted.extendedTextMessage.text;
            }

            // Se nada foi digitado nem marcado, usa o padrão
            if (!textoFinal) textoFinal = "📢 Atenção Grupo!";

            await sock.sendMessage(remoteJid, { 
                text: textoFinal, 
                mentions: ids,
                linkPreview: true // Ativa miniatura caso o texto contenha link
            });

        } catch (e) {
            console.error("Erro no Hidetag:", e);
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao processar o Hidetag." });
        }
    }
}

module.exports = new HidetagCommand();