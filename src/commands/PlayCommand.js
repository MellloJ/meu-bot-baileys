// commands/PlayCommand.js
const Command = require('../core/Command');
const yt = require('../../services/YouTubeService');
const lyrics = require('../../services/LyricsService');

class PlayCommand extends Command {
    constructor() {
        super('play', 'Busca e envia música com letra e capa');
    }

    async execute(sock, msg, args, metadata, utils) {
        // const query = args.join(" ");
        // if (!query) return sock.sendMessage(msg.key.remoteJid, { text: "Qual música?" });

        const { args, conteudo } = context;

        // Se o globalHandler já fez o join, use 'conteudo'
        // Se quiser fazer manualmente, garanta que args existe:
        const busca = conteudo || (args && args.length > 0 ? args.join(" ") : null);

        if (!busca) {
            return await sock.sendMessage(msg.key.remoteJid, { 
                text: "⚠️ Digite o nome da música ou link! Ex: *$play Linkin Park*" 
            });
        }

        const video = await yt.search(busca);
        const [url, letra] = await Promise.all([
            yt.getDownloadUrl(video.url),
            lyrics.find(video.title)
        ]);

        // Envio encapsulado
        await sock.sendMessage(msg.key.remoteJid, { 
            image: { url: video.thumbnail }, 
            caption: `🎧 *${video.title}*${letra}` 
        });
        
        return sock.sendMessage(msg.key.remoteJid, { audio: { url }, mimetype: 'audio/mp4' });
    }
}
module.exports = new PlayCommand();