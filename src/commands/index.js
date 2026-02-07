const { hidetag } = require('../utils');

module.exports = {
    ping: require('./PingCommand'),
    id: require('./IdCommand'),
    kill: require('./KillCommand'),
    add: require('./AddCommand'),
    // play: require('./PlayCommand'),
    // musica: require('./PlayCommand'), // Alias
    figurinha: require('./StickerCommand'),
    // setup: require('./SetupCommand'),
    letra: require('./LyricsCommand'),
    hidetag: require('./HidetagCommand'),
    help: require('./HelpCommand'),
    dono: require('./DonoCommand'),
};