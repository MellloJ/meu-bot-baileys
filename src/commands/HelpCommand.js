// src/commands/HelpCommand.js
const Command = require('../core/Command');

class HelpCommand extends Command {
    constructor() {
        super('help', 'Exibe a lista de comandos disponíveis');
    }

    async execute(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        const commands = require('./index'); // Importa todos os comandos

        let menu = `🤖 *MENU DO BOT*\n\n`;
        menu += `Olá! Aqui estão os comandos que você pode usar:\n\n`;

        // Agrupando por categorias (opcional, mas Clean Code pede organização)
        const categorias = {
            admin: "🛡️ *ADMINISTRAÇÃO*",
            media: "🎬 *MÍDIA & DIVERSÃO*",
            util:  "⚙️ *UTILITÁRIOS*"
        };

        // Vamos separar para exibir bonitinho
        let adminCmds = "";
        let mediaCmds = "";
        let utilCmds = "";

        for (const key in commands) {
            const cmd = commands[key];
            const linha = `> *$${key}* - _${cmd.description}_\n`;

            // Lógica simples de separação (você pode adicionar uma prop 'category' na classe Command depois)
            if (['kill', 'add', 'hidetag', 'setup'].includes(key)) adminCmds += linha;
            else if (['play', 'video', 's'].includes(key)) mediaCmds += linha;
            else utilCmds += linha;
        }

        menu += `${categorias.admin}\n${adminCmds}\n`;
        menu += `${categorias.media}\n${mediaCmds}\n`;
        menu += `${categorias.util}\n${utilCmds}\n`;
        menu += `\n💡 *Dica:* Use \`$setup\` para configurar o grupo.`;

        await sock.sendMessage(remoteJid, { text: menu }, { quoted: msg });
        return true;
    }
}

module.exports = new HelpCommand();