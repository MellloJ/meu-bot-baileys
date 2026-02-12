// src/commands/DonoCommandAbstractClass.js

const Command = require("../core/Command");

class DonoCommandAbstractClass extends Command {
    async execute(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;

        // 1. Checagem Global de Permissão (Dono/Admin Supremo)
        const temPermissaoGeral = utils.temPermissao(msg);
        
        // 2. Checagem de Admin do Grupo
        // const isGroupAdmin = utils.isAdmin(msg, metadata);

        if (!temPermissaoGeral) {
            return await sock.sendMessage(remoteJid, { 
                text: "❌ Este comando só pode ser usado pelo dono do bot." 
            }, { quoted: msg });
        }

        // Se passar pela checagem, executa a lógica específica do comando
        return this.handleDono(sock, msg, context, metadata, utils);
    }

    // Método que os comandos de dono vão implementar no lugar do 'execute'
    async handleDono(sock, msg, context, metadata, utils) {
        throw new Error("O método handleDono deve ser implementado.");
    }
}

module.exports = DonoCommandAbstractClass;