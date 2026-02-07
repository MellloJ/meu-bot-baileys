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

    async createQuote(text, avatar, name, color = "#FFFFFF") {
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
        const res = await axios.post('https://quote-api.up.railway.app/generate', obj);
        return Buffer.from(res.data.result.image, 'base64');
    }
}

module.exports = new StickerService();