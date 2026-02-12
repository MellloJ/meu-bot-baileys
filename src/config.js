// config.js

module.exports = {
    // MODOS: 
    // 'TODOS'          - Bot responde em qualquer grupo
    // 'APENAS_LISTA'   - Responde só nos IDs definidos abaixo
    // 'DESATIVADO'     - Não responde ninguém (exceto Super Admins)
    STATUS_BOT: 'APENAS_LISTA', 

    RESPONDER_PV : true, // Responder mensagens privadas (DM)?

    // IDs dos grupos autorizados (pegue com o comando $id)
    GRUPOS_AUTORIZADOS: [
        '120363423834043528@g.us', // Grupo de teste
        '120363400552496278@g.us', // Bazinga of Programs
        '557191610645-1591037148@g.us', //Baba
        '120363404272026931@g.us', // Região Esquecida
        '120363165318887286@g.us', //Reino Clover
    ],

    // GRUPOS PLUS: Aqui todos são "admins" para o bot
    GRUPOS_PLUS: [
        '120363423834043528@g.us', // Exemplo de ID de grupo Plus
    ],

    // IDs dos donos (Super Admins)
    SUPER_ADMINS: [
        '5563991192094@s.whatsapp.net',
        '223875354857484@lid' //Cooper
    ],

    AUTO_DIVULGAR: [
        '120363404272026931@g.us', // Região Esquecida
        '120363165318887286@g.us', // Reino Clover
        '559484097020-1527216572@g.us', // Anotações
    ],
};