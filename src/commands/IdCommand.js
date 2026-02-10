const AdminCommands = require("./AdminCommands");

class IdCommand extends DonoCommand {
    constructor() {
        super('id', 'Mostra o ID do grupo, usuário mencionado ou mensagem respondida');
    }

    async handleDono(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        
        // 1. Pega o ID de quem foi mencionado com @
        const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        // 2. Pega o ID de quem enviou a mensagem que você respondeu (quoted)
        const respondido = msg.message?.extendedTextMessage?.contextInfo?.participant;

        // 3. Define a prioridade: Menção > Resposta > Grupo
        let idRetorno = mencionado || respondido || remoteJid;
        
        // Define o rótulo para a mensagem
        let alvo = "deste grupo";
        if (mencionado) {
            alvo = "do usuário mencionado";
        } else if (respondido) {
            alvo = "do autor da mensagem";
        }

        try {
            await sock.sendMessage(remoteJid, { 
                text: `🆔 *ID ${alvo}:*\n\n\`${idRetorno}\`` 
            }, { quoted: msg });
        } catch (e) {
            console.error("Erro no IdCommand:", e);
        }
        
        return true;
    }
}

module.exports = new IdCommand();