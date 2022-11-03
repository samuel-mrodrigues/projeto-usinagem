import { ipcMain, BrowserWindow } from "electron"
import fs from "fs"
import path from "path"
import { PropriedadesPrograma, getDiretorioPrograma } from "../../utils/Utils.js"

// Representa uma janela
export default class Janela {

    /**
     * @type {BrowserWindow}
     */
    janelaElectron;

    /**
     * Propriedades da janela
     */
    propriedadesTela = {
        tamanhoTela: {
            width: 100,
            heigth: 100
        },
        posicaoTela: {
            x: 300,
            y: 200
        },
        utilizarEfeitos: true
    }

    /**
     * Propriedades gerais
     */
    propriedadesGerais = {
        nomeOpcional: "",
        atributosElectron: {}
    }

    /**
     * Propriedades ao que é carregado na janela
     */
    propriedadesJanela = {
        caminhoArquivo: ""
    }

    /**
     * Parametros da janela
     */
    parametrosGerais = {
        diretorioTemporario: `${path.resolve(getDiretorioPrograma(), 'temporario')}`
    }

    /**
     * Possível outra janela em que essa janela é vinculada
     * @type {Janela}
     */
    janelaVinculada;

    /**
     * 
     * @param {width: Number, heigth: Number} tamanho
     * @param tamanho Informações do tamanho da janela
     * @param tamanho.width Tamanho horizontal da janela
     * @param tamanho.height Tamanho vertical da janela
     * @param {x: Number, y: Number} posicao 
     * @param posicao Posição da janela no monitor
     * @param posicao.x Posição X na tela
     * @param posicao.y Posição Y na tela
     * @param {String} nome_opcional Nome opcional para identificação da tela 
     * @param {Electron.BrowserWindowConstructorOptions} opcoes Opcoes adicionais do Electron
     */
    constructor(tamanho = { width: 1, heigth: 100 }, posicao = { x: 5, y: 5 }, nome_opcional = "", opcoes = {}) {
        this.propriedadesTela.tamanhoTela.width = tamanho.width
        this.propriedadesTela.tamanhoTela.heigth = tamanho.heigth

        this.propriedadesTela.posicaoTela.x = posicao.x
        this.propriedadesTela.posicaoTela.y = posicao.y

        if (nome_opcional != '') this.propriedadesGerais.nomeOpcional = nome_opcional

        if (Object.keys(opcoes) != 0) {
            for (const campo in opcoes) {
                this.propriedadesGerais.atributosElectron[campo] = opcoes[campo]
            }
        }
    }

    /**
     * Mostra informações detalhadas dessa instancia de janela
     */
    logDados() {
        console.log(`--Informações da Janela--`);
        console.log(`Tamanho da Janela: ${this.propriedadesTela.tamanhoTela.width}x${this.propriedadesTela.tamanhoTela.heigth}`);
        console.log(`Posiçao da Janela: X${this.propriedadesTela.posicaoTela.x} Y${this.propriedadesTela.posicaoTela.y}`);
        console.log(`Nome opcional: ${this.propriedadesGerais.nomeOpcional}`);
        console.log(`Propriedades electron:`);
        console.log(this.propriedadesGerais.atributosElectron);
    }

    /**
     * Cria a janela em si no windows
     */
    criarJanela() {
        console.log(`Criando janela ${this.propriedadesGerais.nomeOpcional} ${this.propriedadesTela.tamanhoTela.width}x${this.propriedadesTela.tamanhoTela.heigth}`);

        let tamanhoWidth = this.propriedadesTela.tamanhoTela.width
        let tamanhoHeigth = this.propriedadesTela.tamanhoTela.heigth

        let posicaoX = this.propriedadesTela.posicaoTela.x
        let posicaoY = this.propriedadesTela.posicaoTela.y

        /**
         * @type {Electron.BrowserWindowConstructorOptions}
         */
        let opcoesJanela = {
            width: tamanhoWidth,
            height: tamanhoHeigth,
            x: posicaoX,
            y: posicaoY,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        }

        for (const campo in this.propriedadesGerais.atributosElectron) {
            opcoesJanela[campo] = this.propriedadesGerais.atributosElectron[campo]
        }

        this.janelaElectron = new BrowserWindow(opcoesJanela)
        if (this.janelaVinculada != null) {
            console.log(`Vinculando janela ativa a outra janela`);
            this.janelaElectron.setParentWindow(this.janelaVinculada.janelaElectron)
        }
    }

    /**
     * Carregar janela, fazendo com que ela abra com o arquivo HTML definido
     */
    async carregarJanela() {
        console.log(`Tentando carregar o arquivo ${this.propriedadesJanela.caminhoArquivo} para a tela ${this.propriedadesGerais.nomeOpcional}`);
        await this.janelaElectron.webContents.loadFile(this.propriedadesJanela.caminhoArquivo)
    }

    /**
     * Aplica o efeito para a abertura inicial da janela
     * @param {Number} tempoAnimacao 
     */
    async aplicarEfeitoAbrir(tempoAnimacao = 5) {
        let widthAlvo = this.propriedadesTela.tamanhoTela.width
        let heigthAlvo = this.propriedadesTela.tamanhoTela.heigth

        let widthAtual = 0
        let heigthAual = 0

        while (1 == 1) {
            widthAtual += 6.0 * (widthAlvo / (tempoAnimacao * 1000))
            if (widthAtual < 1) widthAtual = 1

            if (widthAtual > widthAlvo) break
            this.janelaElectron.setBounds({ width: parseInt(widthAtual.toString().split(".")[0]), height: 0 })
            await this.pausa(0.001)
        }

        while (1 == 1) {
            heigthAual += 5.0 * (heigthAlvo / (tempoAnimacao * 1000))
            if (heigthAual < 1) heigthAual = 1

            if (heigthAual > heigthAlvo) break
            this.janelaElectron.setBounds({ width: parseInt(widthAlvo), height: parseInt(heigthAual.toString().split(".")[0]) })
            await this.pausa(0.001)
        }
    }

    /**
     * Aplica o efeito de fechar a janela
     * @param {Number} tempoAnimacao 
     */
    async aplicarEfeitoFechar(tempoAnimacao = 5) {
        let widthTotal = this.propriedadesTela.tamanhoTela.width
        let heigthTotal = this.propriedadesTela.tamanhoTela.heigth

        let heigthRestante = heigthTotal
        let widthRestante = widthTotal
        while (1 == 1) {
            heigthRestante -= 6.0 * (heigthTotal / (tempoAnimacao * 1000))

            if (heigthRestante <= 0) break
            this.janelaElectron.setBounds({ width: parseInt(widthRestante), height: parseInt(heigthRestante.toString().split(".")[0]) })
            await this.pausa(0.0001)
        }

        while (1 == 1) {
            widthRestante -= 6.0 * (widthTotal / (tempoAnimacao * 1000))

            if (widthRestante <= 0) break
            this.janelaElectron.setBounds({ width: parseInt(widthRestante.toString().split(".")[0]), height: 0 })
            await this.pausa(0.0001)
        }
    }

    /**
     * Aplica o efeito de esconder a janela
     * @param {Number} tempoAnimacao 
     */
    async aplicaEfeitoEsconder(tempoAnimacao = 5) {
        let heigthAtual = this.propriedadesTela.tamanhoTela.heigth
        let widthAtual = this.propriedadesTela.tamanhoTela.width

        let heigthRestante = heigthAtual
        while (1 == 1) {
            heigthRestante -= 6.0 * (heigthAtual / (tempoAnimacao * 1000))

            if (heigthRestante <= 0) break
            this.janelaElectron.setBounds({ width: parseInt(widthAtual), height: parseInt(heigthRestante.toString().split(".")[0]) })
            await this.pausa(0.0001)
        }
    }

    /**
     * Aplica o efeito de mostrar a janela
     * @param {Number} tempoAnimacao 
     */
    async aplicaEfeitoMostrar(tempoAnimacao = 5) {
        let heigthMaximo = this.propriedadesTela.tamanhoTela.heigth
        let widthAtual = this.propriedadesTela.tamanhoTela.width

        let heigthRestante = 0
        while (1 == 1) {
            heigthRestante += 6.0 * (heigthMaximo / (tempoAnimacao * 1000))

            if (heigthRestante > heigthMaximo) break
            this.janelaElectron.setBounds({ width: parseInt(widthAtual), height: parseInt(heigthRestante.toString().split(".")[0]) })
            await this.pausa(0.0001)
        }
    }

    /**
     * Destruir esta instancia da janela
     */
    async destruirJanela() {
        console.log(`Destruindo janela..`);
        this.janelaElectron.close()
    }

    /**
     * Altera o tamanho da janela
     * @param {{width: Number, height: Number}} novoTamanho Tamanho width e heigth
     * @param {Boolean} atualizarTela Atualiza a tela imediatamente com o novo tamanho fornecido
     */
    alterarTamanhoJanela(novoTamanho = { width: 0, heigth: 0 }, atualizarTela = false) {
        this.propriedadesTela.tamanhoTela.width = parseInt(novoTamanho.width)
        this.propriedadesTela.tamanhoTela.heigth = parseInt(novoTamanho.heigth)

        if (atualizarTela) {
            this.janelaElectron.setBounds({
                width: this.propriedadesTela.tamanhoTela.width,
                height: this.propriedadesTela.tamanhoTela.heigth
            })
        }
    }

    /**
     * Define o caminho de um arquivo que essa pagina irá usar
     * @param {String} arquivo_para_ler 
     */
    definirArquivo(arquivo_para_ler) {
        console.log(`Definindo arquivo ${arquivo_para_ler} para a janela ${this.propriedadesGerais.nomeOpcional}`);
        this.propriedadesJanela.caminhoArquivo = arquivo_para_ler
    }

    /**
     * Define o codigo HTML da pagina, mantendo salvo as injecoes feitas e alterações para recarregar
     * @param {String} codigo_html 
     */
    definirHTML(codigo_html) {
        if (!fs.existsSync(this.parametrosGerais.diretorioTemporario)) fs.mkdirSync(this.parametrosGerais.diretorioTemporario)

        let nome = this.propriedadesGerais.nomeOpcional != '' ? this.propriedadesGerais.nomeOpcional : Math.floor(Math.random() * 100000)
        let diretorioSalvar = path.resolve(this.parametrosGerais.diretorioTemporario, `${nome}.html`)
        console.log(`Definindo codigo HTML..`);

        fs.writeFileSync(diretorioSalvar, codigo_html, { encoding: "utf-8" })
        this.definirArquivo(diretorioSalvar)
    }

    /**
     * Injetar o arquivo principal de comunicação
     */
    injetarComunicacao() {
        console.log(`Injetando scripts de alteração...`);
        let htmlAtual = fs.readFileSync(this.propriedadesJanela.caminhoArquivo, { encoding: "utf-8" })

        // Injetar o arquivo de comunicação antes de carregar.
        // O arquivo de comunicação fornece comunicação com a janela para troca de dados
        htmlAtual = `<script>if (typeof module === 'object') { window.module = module; module = undefined; }</script>${htmlAtual}`
        htmlAtual += `<script>if (window.module) module = window.module;</script>`
        if (PropriedadesPrograma.modoDev) {
            htmlAtual += `<script src="${getDiretorioPrograma()}/src/injecoes/comunicacao.js"></script>`
        } else {
            htmlAtual += `<script src="${getDiretorioPrograma()}/injecoes/comunicacao.js"></script>`
        }

        this.definirHTML(htmlAtual)
    }

    /**
     * Adiciona ao fim do HTML algum codigo
     * @param {[String]} codigosHtml 
     */
    appendHTML(codigosHtml = []) {
        let htmlAtual = fs.readFileSync(this.propriedadesJanela.caminhoArquivo, { encoding: "utf-8" })

        for (const codigoAppend of codigosHtml) {
            htmlAtual += codigoAppend
        }
        this.definirHTML(htmlAtual)
    }

    /**
     * Recarregar janela com o arquivo atual já modificado
     */
    recarregarJanela() {
        console.log(`Recarregando pagina...`);
        this.janelaElectron.loadFile(this.propriedadesJanela.caminhoArquivo)
    }

    /**
     * Retorna o codigo HTML da pagina
     * @returns {String}
     */
    getHTML() {
        return new Promise((resolve) => {
            this.janelaElectron.webContents.send("SOLICITAR-HTML")

            ipcMain.once("SOLICITAR-HTML-RESPOSTA", (evento, objeto_dados) => {
                resolve(objeto_dados.dados)
            })
        })
    }


    /**
     * Verifica se a janela esta respondendo
     * @returns {boolean}
     */
    estaPingando() {
        return new Promise((resolve) => {
            let status = false;

            if (this.janelaElectron.isDestroyed()) {
                status = false
                resolve(status)
                return;
            }

            this.janelaElectron.webContents.send("PING")

            let taskid_reload = setTimeout(() => {
                console.log(`Ping de confirmação não respondido`);
                status = false
                resolve(true)
                return;
            }, 7000)

            ipcMain.once("PONG", () => {
                console.log(`PONG!`);
                status = true
                clearInterval(taskid_reload)
                resolve(status)
                return;
            })
        })
    }

    /**
     * Envia uma mensagem via evento para a janela esperar com o ipcRenderer.on('handler_nome')
     * @param {String} handler_nome 
     * @param {*} argumento 
     */
    notificarJanela(handler_nome, argumento) {
        console.log(`Enviando evento ${handler_nome} para a janela ${argumento}`);
        this.janelaElectron.webContents.send(handler_nome, argumento)
    }

    getNomeJanela() {
        return this.propriedadesGerais.nomeOpcional
    }

    /**
     ** Define qual janela essa janela será vinculada
     * @param {BrowserWindow} janela 
     */
    definirJanelaParente(janela) {
        this.janelaVinculada = janela
    }

    /**
     * Ativa ou desativa as animações da tela
     * @param {Boolean} bool 
     */
    ativarEfeitos(bool) {
        this.propriedadesTela.utilizarEfeitos = bool
    }

    async pausa(seg = 1) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, seg * 1000)
        })
    }
}