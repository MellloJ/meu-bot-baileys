// src/services/GroupManager.js
const fs = require('fs');
const path = require('path');

class GroupManager {
    constructor() {
        this.basePath = path.join(__dirname, './settings/groups');
        // Garante que a pasta de configurações exista
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
        }
    }

    // Modelo padrão para novos grupos
    getDefaultConfig(jid) {
        return {
            nome: "Grupo Novo",
            comandosBloqueados: [],
            funcoesExtras: {
                autoBemVindo: false,
                filtroLinks: false,
                antispam: false,
                mensagemBemVindo: ""
            },
            customCommands: {}
        };
    }

    getGroupConfig(jid) {
        const configPath = path.join(this.basePath, `${jid}.js`);
        let config;

        if (fs.existsSync(configPath)) {
            delete require.cache[require.resolve(configPath)];
            config = require(configPath);
        } else {
            config = this.getDefaultConfig(jid);
            this.saveConfig(jid, config);
        }

        // --- TRUQUE DE CLEAN CODE: DEFAULTS ---
        // Isso garante que se você adicionou uma função nova ao bot, 
        // os grupos antigos recebam essa propriedade sem quebrar
        return {
            ...this.getDefaultConfig(jid), // Carrega tudo que é obrigatório
            ...config,                     // Sobrescreve com o que está no arquivo
            funcoesExtras: {
                ...this.getDefaultConfig(jid).funcoesExtras,
                ...config.funcoesExtras
            }
        };
    }

    saveConfig(jid, config) {
        const configPath = path.join(this.basePath, `${jid}.js`);
        
        // Transformamos o objeto em uma string formatada como módulo Node.js
        // Usamos JSON.stringify para formatar os dados e adicionamos o module.exports
        const content = `module.exports = ${JSON.stringify(config, null, 4)};`;
        
        try {
            fs.writeFileSync(configPath, content, 'utf8');
        } catch (error) {
            console.error(`❌ Erro ao salvar configuração do grupo ${jid}:`, error);
        }
    }

    canExecute(jid, commandName) {
        const config = this.getGroupConfig(jid);
        return !config.comandosBloqueados.includes(commandName);
    }
}

module.exports = new GroupManager();