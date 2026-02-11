const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const Jimp = require('jimp');

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

    async createQuote(text, avatarUrl, name) {
        try {
            // 1. Criar o fundo (Estilo WhatsApp Dark: #1f2c33)
            // No Jimp, cores são em hexadecimal ARGB ou via css-color-string
            const canvas = new Jimp(512, 512, 0x00000000); // Transparente
            const bubble = new Jimp(492, 250, '#1f2c33'); // Fundo do balão

            // 2. Carregar Avatar e transformar em círculo
            let avatar;
            try {
                avatar = await Jimp.read(avatarUrl);
                avatar.resize(70, 70);
                avatar.circle(); // Transforma em círculo automaticamente
            } catch (e) {
                avatar = new Jimp(70, 70, '#666666');
                avatar.circle();
            }

            // 3. Carregar Fontes (Jimp usa fontes bitmap .fnt)
            // Jimp já vem com algumas fontes padrão.
            const fontName = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE); // Para o Nome
            const fontText = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE); // Para a Mensagem

            // 4. Montar a imagem
            canvas.composite(bubble, 10, 10); // Coloca o balão no fundo
            canvas.composite(avatar, 25, 25); // Coloca o avatar

            // Escrever o Nome
            canvas.print(fontName, 110, 45, name.slice(0, 20));

            // Escrever o Texto (Wrap automático do Jimp)
            canvas.print(
                fontText,
                110,
                95,
                {
                    text: text,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
                    alignmentY: Jimp.VERTICAL_ALIGN_TOP
                },
                360 // maxWidth
            );

            // 5. Retornar Buffer
            return await canvas.getBufferAsync(Jimp.MIME_PNG);
        } catch (error) {
            console.error("Erro no StickerService (Jimp):", error);
            // Fallback: Retorna apenas uma imagem de erro se tudo falhar
            const errorImg = new Jimp(512, 512, '#ff0000');
            return await errorImg.getBufferAsync(Jimp.MIME_PNG);
        }
    }
}

module.exports = new StickerService();