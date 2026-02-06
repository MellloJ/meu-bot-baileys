const AdminCommands = require("./AdminCommands");

class AddCommand extends AdminCommands {
    constructor() {
        super('add', 'Adiciona o último alvo removido de volta ao grupo');
    }

    async handleAdmin(sock, msg, context, metadata, utils) {
        const ultimoRemovido = utils.getUltimoRemovido();
        const { remoteJid } = msg.key;
        if (!ultimoRemovido) {
            return await sock.sendMessage(remoteJid, { text: "⚠️ Nenhum alvo para adicionar! Use o comando $kill primeiro." });
        }
        
        try {
            await sock.groupParticipantsUpdate(remoteJid, [ultimoRemovido], "add");
            utils.limparUltimoRemovido(); // Limpa o alvo removido após adicionar
            await sock.sendMessage(remoteJid, { text: "✅ Alvo adicionado com sucesso!" });
        } catch (e) {
            await sock.sendMessage(remoteJid, { text: "❌ Erro ao adicionar: Certifique-se de que sou admin." });
        } 
        return true;
    }
}
module.exports = new AddCommand();