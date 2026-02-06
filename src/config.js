// config.js

module.exports = {
    // MODOS: 
    // 'TODOS'          - Bot responde em qualquer grupo
    // 'APENAS_LISTA'   - Responde só nos IDs definidos abaixo
    // 'DESATIVADO'     - Não responde ninguém (exceto Super Admins)
    STATUS_BOT: 'APENAS_LISTA', 

    RESPONDER_PV : false, // Responder mensagens privadas (DM)?

    // IDs dos grupos autorizados (pegue com o comando $id)
    GRUPOS_AUTORIZADOS: [
        '120363423834043528@g.us',
        '120363400552496278@g.us',
    ],

    // GRUPOS PLUS: Aqui todos são "admins" para o bot
    GRUPOS_PLUS: [
        '120363423834043528@g.us', // Exemplo de ID de grupo Plus
    ],

    // IDs dos donos (Super Admins)
    SUPER_ADMINS: [
        '5563991192094@s.whatsapp.net' 
    ]
};