const Command = require("../core/Command");

class DonoCommand extends Command {
    constructor() {
        super('dono', 'Mostra o número e os dados do dono do bot');
    }
    
    async execute(sock, msg, args, metadata, utils) {
        const { remoteJid } = msg.key;
        const infoDono = `👑 *DESENVOLVEDOR DO BOT*\n\n` +
                            `Olá! Este bot foi criado com dedicação por *Jotta*.\n\n` +
                            `🤖 *Agradecimento:* "Obrigado por me dar vida! Fico feliz em automatizar seus grupos."\n\n` +
                            `📞 *Contato do dono:* +55 63 99119-2094\n` +
                            `🌐 *GitHub:* github.com/MellloJ`;
        
        await sock.sendMessage(remoteJid, { text: infoDono }, { quoted: msg });
        return true;
    }
}

module.exports = new DonoCommand();