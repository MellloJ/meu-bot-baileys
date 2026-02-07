// src/services/StickerService.js
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const axios = require('axios');

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

    async createQuote(text, avatar, name) {
        const obj = {
            "type": "quote",
            "format": "png",
            "backgroundColor": "#1c1c1c",
            "width": 512,
            "height": 768,
            "scale": 2,
            "messages": [{
                "entities": [],
                "avatar": true,
                "from": {
                    "id": 1,
                    "name": name,
                    "photo": { "url": avatar }
                },
                "text": text,
                "replyMessage": {}
            }]
        };

        try {
            // Trocando para o endpoint estável da herokuapp/botika
            const res = await axios.post('https://botika-quote-generator.herokuapp.com/generate', obj);
            
            if (res.data && res.data.result && res.data.result.image) {
                return Buffer.from(res.data.result.image, 'base64');
            } else {
                throw new Error("Resposta da API sem imagem.");
            }
        } catch (err) {
            console.error("[StickerService] Erro na API de Quote:", err.message);
            // Fallback: Se a API de Quote falhar, podemos tentar uma segunda opção
            const fallbackRes = await axios.post('https://quote-api.botika.online/generate', obj);
            return Buffer.from(fallbackRes.data.result.image, 'base64');
        }
    }
}

module.exports = new StickerService();