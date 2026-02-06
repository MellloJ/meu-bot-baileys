const AdminCommands = require("./AdminCommands");

class IdCommand extends AdminCommands {
    constructor() {
        super('id', 'Mostra o ID do grupo, usuário mencionado ou mensagem respondida');
    }

    async handleAdmin(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        const { mencaoDireta, mensagemRespondida } = context;

        let idRetorno = mencaoDireta || mensagemRespondida || remoteJid;
        let alvo = mencaoDireta ? "do usuário" : mensagemRespondida ? "da resposta" : "deste grupo";

        await sock.sendMessage(remoteJid, { text: `🆔 *ID ${alvo}:*\n\n\`${idRetorno}\`` }, { quoted: msg });
        return true;
    }
}
module.exports = new IdCommand();