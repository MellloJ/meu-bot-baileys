const play = require('play-dl');

let initialized = false;

async function initYoutubeAuth() {
    if (initialized) return;

    if (process.env.YOUTUBE_COOKIE) {
        await play.setToken({
            youtube: {
                cookie: process.env.YOUTUBE_COOKIE
            }
        });

        console.log("[YouTube] Cookie carregado com sucesso");
    } else {
        console.log("[YouTube] Rodando sem cookie");
    }

    initialized = true;
}

module.exports = initYoutubeAuth;
