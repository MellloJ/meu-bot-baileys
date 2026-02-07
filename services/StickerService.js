// src/services/StickerService.js
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const axios = require('axios');
const { createCanvas, loadImage, registerFont } = require('canvas');


class StickerService {
    constructor() {
        this.pack = "Bot Pack";
        this.author = "Gemini Bot";
    }

    async createSticker(buffer) {
        return new Sticker(buffer, {
            pack: this.pack,
            author: this.author,
            type: StickerTypes.FULL,
            categories: ['🤩', '🎉'],
            id: '12345',
            quality: 70,
        });
    }

    // src/services/StickerService.js

    // src/services/StickerService.js

    async createQuote(text, avatarUrl, name) {
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');

        // Fundo Arredondado (Estilo WhatsApp Dark)
        ctx.fillStyle = '#1f2c33';
        this.roundRect(ctx, 10, 10, 492, 250, 20, true);

        // Desenhar Avatar (Círculo)
        try {
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(60, 60, 35, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 25, 25, 70, 70);
            ctx.restore();
        } catch (e) {
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(60, 60, 35, 0, Math.PI * 2);
            ctx.fill();
        }

        // Nome do Usuário
        ctx.fillStyle = '#d1d7db';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(name.slice(0, 20), 110, 55);

        // Texto da Mensagem
        ctx.fillStyle = '#e9edef';
        ctx.font = '22px sans-serif';
        this.wrapText(ctx, text, 110, 95, 360, 30);

        return canvas.toBuffer('image/png');
    }

    // Funções auxiliares para desenhar
    roundRect(ctx, x, y, width, height, radius, fill) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }
}

module.exports = new StickerService();