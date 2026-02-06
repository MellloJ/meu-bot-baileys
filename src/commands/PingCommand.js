const Command = require("../../core/Command");

class PingCommand extends Command {
    constructor() {
        super('ping', 'Verifica a latência e o tempo online do bot');
    }

    async execute(sock, msg, context, metadata, utils) {
        const { remoteJid } = msg.key;
        const uptimeSegundos = process.uptime();
        const tempoHumano = utils.formatarTempo(uptimeSegundos);

        // 2. Latência da mensagem (Tempo de resposta)
        // O timestamp do WhatsApp vem em segundos, convertemos para ms (* 1000)
        const timestampMsg = msg.messageTimestamp * 1000;
        const latenciaMs = Date.now() - timestampMsg;
        const latenciaHumana = utils.formatarLatencia(latenciaMs);

        await sock.sendMessage(remoteJid, { 
            text: `🏓 *Pong!*\n\n*Resposta:* ${latenciaHumana}\n*Servidor online há:* ${tempoHumano}` 
        }, { quoted: msg });
        
        return true;
    }
}
module.exports = new PingCommand();