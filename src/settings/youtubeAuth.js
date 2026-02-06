const play = require('play-dl');

let initialized = false;

async function initYoutubeAuth() {
    if (initialized) return;

    if (process.env.YOUTUBE_COOKIE) {
        await play.setToken({
            youtube: {
                cookie: cookies,
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0"
            }
        });

        console.log("[YouTube] Cookie carregado com sucesso");
    } else {
        console.log("[YouTube] Rodando sem cookie");
    }

    initialized = true;
}

module.exports = initYoutubeAuth;
