// commands/PlayCommand.js
const Command = require('../core/Command');
const yt = require('../../services/YouTubeService');
const lyrics = require('../../services/LyricsService');

class PlayCommand extends Command {
    constructor() {
        super('play', 'Busca e envia música com letra e capa');
    }

    async execute(sock, msg, args, metadata, utils) {
        const query = args.join(" ");
        if (!query) return sock.sendMessage(msg.key.remoteJid, { text: "Qual música?" });

        const video = await yt.search(query);
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