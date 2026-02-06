// src/core/AdminCommand.js

const Command = require("../core/Command");

class AdminCommands extends Command {
    async execute(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;

        // 1. Checagem Global de Permissão (Dono/Admin Supremo)
        const temPermissaoGeral = utils.temPermissao(msg);
        
        // 2. Checagem de Admin do Grupo
        const isGroupAdmin = utils.isAdmin(msg, metadata);

        if (!temPermissaoGeral && !isGroupAdmin) {
            return await sock.sendMessage(remoteJid, { 
                text: "❌ Este comando é restrito a administradores." 
            }, { quoted: msg });
        }

        // Se passar pela checagem, executa a lógica específica do comando
        return this.handleAdmin(sock, msg, context, metadata, utils);
    }

    // Método que os comandos de admin vão implementar no lugar do 'execute'
    async handleAdmin(sock, msg, context, metadata, utils) {
        throw new Error("O método handleAdmin deve ser implementado.");
    }
}

module.exports = AdminCommands;