// Esse arquivo é responsavél pelo gerenciamento das janelas abertas

import { BrowserWindow, ipcMain, screen, globalShortcut, app, dialog } from "electron"
import { SessaoExon } from "../sessao/SessaoExon.js"
import { getDiretorioPrograma, PropriedadesPrograma, mostraNotificacao } from "../../utils/Utils.js"
import axios from "axios"

import Janela from "./janela.js"

// Diretorio do programa
const caminhoDoPrograma = getDiretorioPrograma()
const estaModoDev = PropriedadesPrograma.modoDev

/**
 * Esse objeto permite navegar por urls de um site simulando um usuario normal
 */
let SessaoAtual = new SessaoExon()

/**
 * A janela principal do programa, onde fica os menus de interação e menus minimizados
 * @type {BrowserWindow}
 */
let janelaPrincipal;

/**
 * Armazena os slots que forem do tipo ficha tecnica
 */
let slotsFichaTecnica = {
    /**
    * @type {[Janela]}
    */
    slotsFichas: [],
    visualizandoPdf: false
}

/**
 * Armazena informações do slot de produção
 */
let slotJanelaProducao = {
    /**
    * @type {Janela}
    */
    slotProducao: undefined,
    janelaProducaoTaskid: -1
}

/**
 * Janela fundo, onde os slots se "apoiam"
 * @type {Janela}
 */
let janelaFundo;

/**
 * Algumas coisas uteis
 */
let utils = {
    /**
     * Salva o ID do setinterval que fica fazendo a janela aparecer
     */
    taskidIntervaloMostraJanela: -1,
    permiteGanharFocoJanelaPrincipal: true
}

/**
 * Realiza o startup do gerenciador de janelas
 */
export async function iniciarGerenciadorJanelas() {

    // Pega a janela principal do programa
    janelaPrincipal = BrowserWindow.getAllWindows().find(janelaObjeto => janelaObjeto.JANELA_MASTER != undefined)

    // Cria a janela de fundo que ficara atrás dos slots
    await criarJanelaFundo()

    // Seta a janela principal como parente da janela de fundo
    janelaPrincipal.setParentWindow(janelaFundo.janelaElectron)

    // Cadastra os atalhos globais do programa, que funcionam sem precisar estar com o programa em foco
    // cadastrarAtalhosGlobais()
}


function log(msg) {
    console.log(msg);

    if (janelaPrincipal != undefined) {
        janelaPrincipal.webContents.send("LOG-CONSOLE", msg)
    }
}

/**
 * Cadastra os handlers que serão invokados pelo processo do renderer
 */
export function cadastrarHandlersJanelas() {
    log(`Gerenciador de janelas: Cadastrando handlers...`);

    log("Cadastrando handler: ABRIR-MOSTRAR-JANELA-PRINCIPAL")
    ipcMain.handle("MOSTRAR-JANELA-PRINCIPAL", () => {

        mostraJanelaPrincipal(true)
    })

    log("Cadastrando handler: OCULTAR-JANELA-PRINCIPAL")
    ipcMain.handle("OCULTAR-JANELA-PRINCIPAL", () => {

        mostraJanelaPrincipal(false)
    })

    log("Cadastrando handler: ABRIR-JANELAS")
    ipcMain.handle("ABRIR-JANELAS", async (ev, dadosJanela) => {
        return await abrirTelasConfiguradas(dadosJanela)
    })

    log("Cadastrando handler: FECHAR-JANELAS")
    ipcMain.handle("FECHAR-JANELAS", async (ev, parametrosFechar) => {
        return fecharTodasJanelas(parametrosFechar)
    })

    log("Cadastrando handler: TOGGLE-MODO-MINIMIZADO")
    ipcMain.handle("TOGGLE-MODO-MINIMIZADO", async (ev, bool) => {
        await alterarParaModoMinimizado(bool)
    })

    log("Cadastrando handler: TOGGLE-INTERATIVIDADE-JANELAPRINCIPAL")
    ipcMain.handle("TOGGLE-INTERATIVIDADE-JANELAPRINCIPAL", async (ev, bool) => {
        toggleFocoJanelaPrincipal(bool)
    })

    log("Cadastrando handler: TOGGLE-ESCONDER-JANELAPRINCIPAL")
    ipcMain.handle("TOGGLE-ESCONDER-JANELAPRINCIPAL", async (ev, bool) => {
        toggleMostrarJanelaPrincipal(bool)
    })

    log("Cadastrando handler: MOSTRAR-DIALOGO")
    ipcMain.handle("MOSTRAR-DIALOGO", async (ev, propsMsg) => {
        let janelaQueSolicitou = BrowserWindow.getAllWindows().find(janelaAberta => janelaAberta.webContents.id == ev.sender.id)

        dialog.showMessageBox(janelaQueSolicitou, propsMsg)
    })

    log("Cadastrando handler: TOGGLE-PERMITIR-FOCO")
    ipcMain.handle("TOGGLE-PERMITIR-FOCO", async (ev, boolean) => {
        utils.permiteGanharFocoJanelaPrincipal = boolean
    })

    log(`Cadastrando handler: MINIMIZAR-PROGRAMA`)
    ipcMain.handle("MINIMIZAR-PROGRAMA", async () => {
        janelaPrincipal.minimize()
        janelaFundo.janelaElectron.minimize()
    })
}

/**
 * Cadastra os atalhos globais do programa
 */
function cadastrarAtalhosGlobais() {

    if (!globalShortcut.isRegistered("F1")) {
        // Mostrar janela principal
        globalShortcut.register("F1", () => {
            log(`F1: Alterar mostrando janela!`);
            janelaPrincipal.webContents.send("TOGGLE-MODO-MINIMIZADO")
        })
    }

    if (!globalShortcut.isRegistered("F2")) {
        globalShortcut.register("F2", () => {
            app.quit()
        })
    }

    if (!globalShortcut.isRegistered("CommandOrControl+Right")) {
        // Proxima pagina
        globalShortcut.register("CommandOrControl+Right", () => {
            log("Proximo Produto");
            janelaPrincipal.webContents.send("ALTERAR-PRODUTO", "avancar")
        })
    }

    if (!globalShortcut.isRegistered("CommandOrControl+Left")) {
        // Pagina anterior
        globalShortcut.register("CommandOrControl+Left", () => {
            log(`Anterior Produto`);
            janelaPrincipal.webContents.send("ALTERAR-PRODUTO", "voltar")
        })
    }
}

/**
 * @typedef ParametrosAberturaJanelaProduto
 * @property {String} codigo
 * @property {{id: Number, descricao: String}} marca
 */

/**
 * @typedef ParametrosAberturaJanela
 * @property {String} tipo
 * @property {String} nome
 * @property {{aba_id: Number, abrirDesenhosAutomatico: Boolean}} propriedades
 * @property {Boolean} oculto
 */

/**
 * @typedef ParametrosAbertura
 * @property {[[ParametrosAberturaJanela]]} janelas 
 * @property {Number} usuarioId
 * @property {ParametrosAberturaJanelaProduto} produto
 * @property {Boolean} usarEfeitos
 */


// Informações do display do usuario
let janelaWidth = 0
let janelaHeigth = 0

// Posição onde irá ficar a janela
let posicaoX = 0
let posicaoY = 0

/**
 * Ultimos parametros de abertura
 * @type {ParametrosAbertura}
 */
let ultimosParametrosAbertura = {}

/**
 * Realiza a abertura das telas configuradas pelo usuario
 * @param {ParametrosAbertura} parametrosAbertura
 */
async function abrirTelasConfiguradas(parametrosAbertura) {
    log(`Iniciando a abertura das telas, parametros:`);
    log(parametrosAbertura);
    ultimosParametrosAbertura = parametrosAbertura

    log(`Informações das janelas`)
    parametrosAbertura.janelas.forEach(janelaObj => console.log(janelaObj))

    mostraJanelaPrincipal(true)
    toggleOpacidadeJanelaPrincipal(1)
    clearInterval(utils.taskidIntervaloMostraJanela)
    await pausa(1)

    log(`Definindo usuario para login no Exon...`);
    await SessaoAtual.definirLogin(parametrosAbertura.usuarioId)

    // Codigo do produto ex: 'HF 01'
    let produtoCodigo = parametrosAbertura.produto.codigo

    // Informações da marca do produto(no caso se for OP)
    let produtoMarca = {
        id: parametrosAbertura.produto.marca.id,
        descricao: parametrosAbertura.produto.marca.descricao
    }

    console.log(`Produto selecionado: ${produtoCodigo}, ${produtoMarca}`);

    let janelas = parametrosAbertura.janelas
    let infoDisplayPrincipal = screen.getPrimaryDisplay().workArea;

    log(`Informações do display atual:`);
    log(infoDisplayPrincipal);

    // Dados HTML da ficha do produto no exon
    let exonFichaProduto = null

    // Ignorar proximas aberturas de slots da ficha tecnica
    let ignorarAbrirFicha = false

    // Dados HTML da tela de producao das OPs do Exon
    let exonTelaProducao = null


    // Verifica se não esta logado
    if (!SessaoAtual.logado) {

        let deuAlgumErro = false;
        for (let index = 0; index < 3; index++) {
            mostraNotificacao(!deuAlgumErro ? `Autenticando-se ao Exon...` : `Tentando se autenticar ao Exon novamente...`)
            await pausa(1)

            // Tenta se logar
            let statusLogin = await SessaoAtual.iniciarLogin()
            if (statusLogin.sucesso) {
                mostraNotificacao(`Autenticado com sucesso`, 0, "ok")
                break;
            } else {
                deuAlgumErro = true;
                mostraNotificacao(`Sem sucesso ao autenticar ao Exon...`, 5, "erro")
                await pausa(3)
            }
        }

        if (!SessaoAtual.logado) {
            mostraNotificacao(`Não foi possível acessar o Exon, tente mais tarde...`, 5, "erro")

            return false;
        }
    }

    await pausa(1)
    // Passa por cada linha de slot configurado
    for (let linha = 0; linha < janelas.length; linha++) {
        let totalDeJanelas = janelas[linha].length
        log(`Montando janelas da linha ${linha}, janelas para gerar: ${totalDeJanelas}`);

        // Passa por cada slot na linha atual
        for (let janela = 0; janela < janelas[linha].length; janela++) {
            await pausa(1)

            /**
             * @type {ParametrosAberturaJanela}
             */
            const janelaPropriedades = janelas[linha][janela]
            log(janelaPropriedades);

            // Informações do display do usuario
            janelaWidth = infoDisplayPrincipal.width / janelas[linha].length;
            janelaHeigth = infoDisplayPrincipal.height / janelas.length

            // Posição onde irá ficar a janela
            posicaoX = janelaWidth * janela;
            posicaoY = janelaHeigth * linha
            log(`Gerando janela ${janelaWidth}x${janelaHeigth}`);
            log(`Posição X${posicaoX}, Y: ${posicaoY}`);

            // Instancia um objeto janela
            let janelaObjeto = new Janela({ heigth: 0, width: 0 }, { x: posicaoX, y: posicaoY }, janelaPropriedades.nome, { resizable: false, titleBarStyle: "hidden", movable: false, fullscreenable: false, frame: false })

            // Ativa ou desativa os efeitos 
            janelaObjeto.ativarEfeitos(parametrosAbertura.usarEfeitos)

            // Define a janela de fundo como janela pai dessa nova janela
            janelaObjeto.definirJanelaParente(janelaFundo)

            // Verifica o tipo da janela sendo aberta
            switch (janelaPropriedades.tipo) {
                case "ficha_tecnica":

                    // Ignora a abertura
                    if (ignorarAbrirFicha) {
                        log(`Ignorando abertura de ficha pois deu algum erro ao obter o HTML da ficha...`);
                        continue;
                    }

                    // Verifica se já essa janela com esse nome esta aberta
                    let janelaExistente = slotsFichaTecnica.slotsFichas.find(janela => janela.getNomeJanela() == janelaPropriedades.nome)
                    let janelaJaAberta = false
                    if (janelaExistente != undefined) {
                        log(`Utlizando janela existente`);
                        janelaObjeto = janelaExistente
                        janelaJaAberta = true
                    } else {
                        log(`Utilizando nova janela...`);
                    }

                    let aba_definida = janelaPropriedades.propriedades.aba_id
                    log(`Tela é uma ficha tecnica da aba ${aba_definida}`);

                    // Informações da aba no banco do exon
                    let exonAbaInformacoes = await getAbaDados(aba_definida)

                    // Se o HTML da pagina da ficha não foi carregado ainda, tenta carregar
                    if (exonFichaProduto == null) {
                        log(`Pegando dados da ficha do produto`);
                        mostraNotificacao(`Consultando ficha de ${produtoCodigo}, aguarde..`, 0, "aviso")

                        let statusSolicitarFicha = await SessaoAtual.getDadosFichaProduto(produtoCodigo)
                        if (statusSolicitarFicha.sucesso) {
                            exonFichaProduto = statusSolicitarFicha.conteudo
                        } else {
                            log(`Erro ao recuperar HTML do produto ${produtoCodigo}`);
                            ignorarAbrirFicha = true
                            mostraNotificacao(`${statusSolicitarFicha.erro}`, 0, "erro")
                            await pausa(2)
                            continue;
                        }

                    } else {
                        log(`Utilizando HTML gerado anteriormente!`);
                    }

                    mostraNotificacao(`Carregando ficha tecnica ${janelaPropriedades.nome} de ${produtoCodigo}`, 0, "aviso")

                    // Aplica as modificações no HTML
                    configurarTelaFichaExon(janelaObjeto, exonFichaProduto)

                    // Se a janela ainda não tiver sido criada, cria ela
                    if (!janelaJaAberta) {
                        janelaObjeto.criarJanela()

                        let atualizarImediatamente = parametrosAbertura.usarEfeitos == false
                        log(`Width: ${janelaWidth}, Heigth: ${janelaHeigth}`)
                        janelaObjeto.alterarTamanhoJanela({ heigth: janelaHeigth, width: janelaWidth }, atualizarImediatamente)
                    }

                    janelaObjeto.janelaElectron.moveTop()
                    janelaPrincipal.moveAbove(janelaObjeto.janelaElectron.getMediaSourceId())

                    // Se a janela já tiver aberta, faz uns efeito de esconder e mostra dnv caso o parametro de efeitos esteja ativado

                    if (parametrosAbertura.usarEfeitos) {
                        if (janelaJaAberta) {
                            janelaObjeto.janelaElectron.webContents.send("ESCONDER-PAGINA", true)
                            await janelaObjeto.aplicaEfeitoEsconder(0.5)
                        } else {
                            await janelaObjeto.aplicarEfeitoAbrir(0.5)
                        }
                    }

                    // Carregar o HTML definido do slot
                    await janelaObjeto.carregarJanela()

                    // Se a janela já tiver aberta, aplico o efeito de mostrar se tiver os efeitos ativados
                    if (parametrosAbertura.usarEfeitos) {
                        if (janelaJaAberta) {
                            if (parametrosAbertura.usarEfeitos) await janelaObjeto.aplicaEfeitoMostrar(0.5)
                        }
                    }

                    // janelaObjeto.janelaElectron.webContents.openDevTools()

                    // Define o ID dessa janela
                    janelaObjeto.janelaElectron.webContents.send("DEFINIR-WEBCONTENTID", janelaObjeto.janelaElectron.webContents.id)

                    // Define as informações do produto
                    janelaObjeto.janelaElectron.webContents.send("DEFINIR-PRODUTO", { codigo: produtoCodigo, marca: { id: produtoMarca.id, descricao: produtoMarca.descricao } })

                    // Define o ID da aba para mostrar
                    janelaObjeto.janelaElectron.webContents.send("DEFINIR-ABA-JANELA", aba_definida)

                    // Nome da janela
                    janelaObjeto.janelaElectron.webContents.send("DEFINIR-NOME-JANELA", exonAbaInformacoes != undefined ? exonAbaInformacoes.descricao.trim() : janelaPropriedades.nome)

                    // Envia a pagina a aba que ele deverá mostrar e confirma que está ok para mostrar
                    janelaObjeto.janelaElectron.webContents.send("OK")

                    // Verifica se tem que abrir o desenho automaticamente
                    if (janelaPropriedades.propriedades.abrirDesenhosAutomatico) {
                        janelaObjeto.janelaElectron.webContents.send("ABRIR-DESENHO-AUTOMATICO")

                        console.log(`Esperando confirmação do PDF...`);
                        await janelaObjeto.escutarEvento("STATUS-DESENHOAUTOMATICO", (conseguiuAbrir) => {

                            console.log(`Consegiu abrir?`);
                            console.log(conseguiuAbrir);
                            if (!conseguiuAbrir) {

                                console.log(`Ocorreu um erro ao abrir desenho automatico da janela ${janelaPropriedades.nome}`);

                                janelaPropriedades.oculto = true;
                                console.log(`Recalculando tamanho das janelas`);
                                // atualizarTamanhoJanelas()
                            } else {
                                console.log(`Conseguiu abrir o desenho automatico!`);
                            }
                        })

                        console.log(`Confirmação do PDF ok...`);
                    }

                    // Adiciona o objeto na lista de janelas de ficha tecnica
                    if (!janelaExistente) {
                        slotsFichaTecnica.slotsFichas.push(janelaObjeto)
                    }
                    break;
                case "tela_producao":
                    // Se a janela de produção já tiver aberta, só continuar...
                    if (slotJanelaProducao.slotProducao != undefined) continue;

                    log(`Tela é da produção`);

                    // Caso a janela de produção n tenha sido carregada ainda, tenta pegar ela
                    if (exonTelaProducao == null) {
                        log(`Pegando dados da produção do usuario atual...`);
                        mostraNotificacao(`Consultando produção de OPs, aguarde...`, 0, "aviso")

                        let statusTelaProducao = await SessaoAtual.getTelaProducao()
                        if (statusTelaProducao.sucesso) {
                            exonTelaProducao = statusTelaProducao.conteudo
                        } else {
                            mostraNotificacao(`${statusTelaProducao.erro}`, 0, "erro")
                            continue;
                        }

                    } else {
                        log(`Utilizando tela de produção anterior...`);
                    }

                    mostraNotificacao(`Carregando slot de produção`, 0, "aviso")

                    // Aplica as modificações no HTML
                    configurarTelaProducao(janelaObjeto, exonTelaProducao)

                    // Usar ou não os efeitos de abrir/fechar da janela
                    let atualizarImediatamente = parametrosAbertura.usarEfeitos == false

                    // Cria a janela
                    janelaObjeto.criarJanela()
                    janelaObjeto.alterarTamanhoJanela({ heigth: janelaHeigth, width: janelaWidth }, atualizarImediatamente)
                    janelaObjeto.janelaElectron.moveTop()
                    janelaPrincipal.moveAbove(janelaObjeto.janelaElectron.getMediaSourceId())

                    // Efeitos legais
                    if (parametrosAbertura.usarEfeitos) {
                        await janelaObjeto.aplicarEfeitoAbrir(1)
                    }

                    // Carregar o HTML definido nesse slot
                    await janelaObjeto.carregarJanela()

                    // Avisa a pagina que esta tudo ok para mostrar
                    // janelaObjeto.janelaElectron.webContents.openDevTools()
                    janelaObjeto.janelaElectron.webContents.send("OK")
                    slotJanelaProducao.slotProducao = janelaObjeto

                    slotJanelaProducao.janelaProducaoTaskid = setInterval(async () => {
                        janelaObjeto.janelaElectron.webContents.send("ESCONDER-PAGINA", true)
                        let statusTelaProducao = await SessaoAtual.getTelaProducao()
                        if (statusTelaProducao.sucesso) {
                            configurarTelaProducao(janelaObjeto, statusTelaProducao.conteudo)

                            await pausa(1)
                            await janelaObjeto.carregarJanela()
                            janelaObjeto.janelaElectron.webContents.send("OK")
                        }
                    }, 60000);
                    break;
                default:
                    log(`Tela sem definição: ${janelaPropriedades.tipo}`);
                    break;
            }
        }
    }

    mostraNotificacao(`Carregamento de slots concluido`, 3, "ok")
    janelaFundo.janelaElectron.setFullScreen(true)
    toggleOpacidadeJanelaPrincipal(0.7)

    janelaPrincipal.moveTop()

    utils.taskidIntervaloMostraJanela = new setInterval(() => {
        if (utils.permiteGanharFocoJanelaPrincipal) {
            priorizarFocoTelaPrincipal()
        }
    }, 500)

    atualizarTamanhoJanelas()
    return true;
}

/**
 * Recalcula o tamanho das janelas
 */
function atualizarTamanhoJanelas() {
    console.log(`Recalculando janelas...`);
    let infoDisplayPrincipal = screen.getPrimaryDisplay().workArea;
    ultimosParametrosAbertura.janelas = ultimosParametrosAbertura.janelas.map(linhasSlots => {
        let novoArray = []

        for (const slotJanela of linhasSlots) {
            if (!slotJanela.oculto) {
                novoArray.push(slotJanela)
            } else {
                console.log(`Preciso remover a janela ${slotJanela.nome}`);

                if (slotJanela.tipo == "ficha_tecnica") {
                    slotsFichaTecnica.slotsFichas = slotsFichaTecnica.slotsFichas.filter(slotFichaObj => {
                        if (slotFichaObj.getNomeJanela() != slotJanela.nome) {
                            return true;
                        } else {
                            slotFichaObj.janelaElectron.close();
                            return false;
                        }
                    })
                }
            }
        }

        return novoArray;
    })

    ultimosParametrosAbertura.janelas = ultimosParametrosAbertura.janelas.filter(linhaSlots => linhaSlots.length != 0)

    console.log(`Janelas restantes:`);
    console.log(ultimosParametrosAbertura.janelas);

    if (ultimosParametrosAbertura.janelas.length == 0) {
        console.log(`Nada para atualizar!`);
        return;
    }
    for (let linha = 0; linha < ultimosParametrosAbertura.janelas.length; linha++) {
        // Passa por cada slot na linha atual
        for (let janela = 0; janela < ultimosParametrosAbertura.janelas[linha].length; janela++) {
            /**
             * @type {ParametrosAberturaJanela}
             */
            const janelaPropriedades = ultimosParametrosAbertura.janelas[linha][janela]
            console.log(`Recalculando janela: ${janelaPropriedades.nome}`);

            // Informações do display do usuario
            janelaWidth = infoDisplayPrincipal.width / ultimosParametrosAbertura.janelas[linha].length;
            janelaHeigth = infoDisplayPrincipal.height / ultimosParametrosAbertura.janelas.length
            console.log(`Width: ${janelaWidth}, Heigth: ${janelaHeigth}`);

            posicaoX = janelaWidth * janela;
            posicaoY = janelaHeigth * linha
            console.log(`X: ${posicaoX}, Y: ${posicaoY}`);

            /**
             * 
             */
            let referenciaJanelaObj;
            switch (janelaPropriedades.tipo) {
                case "ficha_tecnica":
                    referenciaJanelaObj = slotsFichaTecnica.slotsFichas.find(janelaObj => janelaObj.getNomeJanela() == janelaPropriedades.nome)
                    break;
                case "tela_producao":
                    referenciaJanelaObj = slotJanelaProducao.slotProducao
                    break;
            }

            if (referenciaJanelaObj == undefined) continue;

            referenciaJanelaObj.alterarPosicaoJanela({ x: posicaoX, y: posicaoY }, true)
            referenciaJanelaObj.alterarTamanhoJanela({ heigth: janelaHeigth, width: janelaWidth }, true)
        }
    }
}

/**
 * Fecha todas os slots abertos
 * @param {{ativarEfeitos: Boolean}} parametros
 * @returns {boolean}
 */
async function fecharTodasJanelas(parametros = { ativarEfeitos: true }) {
    log(`Fechando janelas abertas...`);

    // Fechar os slots da ficha tecnica
    clearInterval(utils.taskidIntervaloMostraJanela)
    for (let janelaFicha of slotsFichaTecnica.slotsFichas) {
        janelaFicha.janelaElectron.webContents.send("ESCONDER-PAGINA", true)
        if (parametros.ativarEfeitos) await janelaFicha.aplicarEfeitoFechar(1)
        janelaFicha.janelaElectron.close()
    }

    // Fechar o slot de produção
    if (slotJanelaProducao.slotProducao != undefined) {
        slotJanelaProducao.slotProducao.janelaElectron.webContents.send("ESCONDER-PAGINA", true)
        if (parametros.ativarEfeitos) await slotJanelaProducao.slotProducao.aplicarEfeitoFechar(1)
        slotJanelaProducao.slotProducao.janelaElectron.close()
        clearInterval(slotJanelaProducao.janelaProducaoTaskid)
    }

    // Zerar variaveis
    slotsFichaTecnica.slotsFichas = []
    slotJanelaProducao.slotProducao = undefined
    log(`Janelas fechadas`);
    janelaPrincipal.setAlwaysOnTop(false, "normal")
    return true
}


/**
 * Aplica modificações em um slot que seja do tipo ficha tecnica
 * @param {Janela} objetoJanela 
 * @param {String} telaHTML 
 */
function configurarTelaFichaExon(objetoJanela, telaHTML) {
    log(`Aplicando configuração de ficha tecnica ao objeto janela`);
    telaHTML = telaHTML.replace('<body>', '<body style="opacity: 0%; overflow: hidden">')

    log(`Diretorio do programa: ${caminhoDoPrograma}`);
    objetoJanela.definirHTML(telaHTML)
    objetoJanela.injetarComunicacao()
    if (estaModoDev) {
        objetoJanela.appendHTML(
            [
                `<script src="${caminhoDoPrograma}/src/injecoes/ficha tecnica/modificacoes_ficha.js"></script>`,
                `<script src="${caminhoDoPrograma}/src/injecoes/ficha tecnica/pdf.min.js"></script>`,
                `<link rel="stylesheet" href="${caminhoDoPrograma}/src/injecoes/ficha tecnica/estilos_ficha.css"></link>`
            ]
        )
    } else {
        objetoJanela.appendHTML(
            [
                `<script src='${caminhoDoPrograma}/injecoes/ficha tecnica/modificacoes_ficha.js'></script>`,
                `<script src='${caminhoDoPrograma}/injecoes/ficha tecnica/pdf.min.js'></script>`,
                `<link rel="stylesheet" href="${caminhoDoPrograma}/injecoes/ficha tecnica/estilos_ficha.css"></link>`
            ]
        )
    }
}

/**
 * Aplica modificações em um slot que seja do tipo tela de produção
 * @param {Janela} objetoJanela 
 * @param {String} telaHTML 
 */
function configurarTelaProducao(objetoJanela, telaHTML) {
    log(`Aplicando configuração de tela de produção ao objeto janela`);
    telaHTML = telaHTML.replace('<body>', '<body style="opacity: 0%; overflow: hidden">')

    objetoJanela.definirHTML(telaHTML)
    objetoJanela.injetarComunicacao()
    if (estaModoDev) {
        objetoJanela.appendHTML([
            `<script src="${caminhoDoPrograma}/src/injecoes/ops/modificacoes_producao_ops.js"></script>`,
            `<link rel="stylesheet" href="${caminhoDoPrograma}/src/injecoes/ops/estilos_producao_ops.css"></link>`
        ])
    } else {
        objetoJanela.appendHTML([
            `<script src="${caminhoDoPrograma}/injecoes/ops/modificacoes_producao_ops.js"></script>`,
            `<link rel="stylesheet" href="${caminhoDoPrograma}/injecoes/ops/estilos_producao_ops.css"></link>`
        ])
    }
}

/**
 * Cria a janela de fundo onde os slots serão posicionados
 */
async function criarJanelaFundo() {
    log("Criando janela de fundo...")
    janelaFundo = new Janela({ heigth: 5, width: 5 }, { x: 0, y: 0 }, "fundo", { fullscreenable: true, movable: true, frame: false })
    let fundoHTML = `<!DOCTYPE html>
    <html>
    
    <head>
        <meta charset='utf-8'>
        <meta http-equiv='X-UA-Compatible' content='IE=edge'>
        <meta name='viewport' content='width=device-width, initial-scale=1'>
        <style>
            * {
            -webkit-user-select: none;
            user-select: none;
            } 
        </style>
    </head>
    
    <body>
    </body>
    
    </html>
    <style>
    html {
        background-color: rgb(24, 23, 23);
        font-family: Avenir, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
    }

    .botoes {
        display: flex;
        justify-content: space-around;
    }

    .botoes p {
        padding: 0;
        margin: 0;
        color: white;
        font-size: 4rem;
        font-weight: bold;
        border-bottom: 3px solid #c5c52deb;
        border-bottom-left-radius: 7px;
        border-bottom-right-radius: 7px;
    }
    </style>
    <script>
    document.onkeydown = (ev) => {
        switch (ev.key.toLowerCase()) {
            case "f1":
                ipcRenderer.send("F1")
                break;
            case "f2":
                ipcRenderer.send("F2")
                break;
            default:
                break;
        }
    };
    </script>
    `
    janelaFundo.definirHTML(fundoHTML)
    janelaFundo.injetarComunicacao()
    janelaFundo.criarJanela()
    janelaPrincipal.moveAbove(janelaFundo.janelaElectron.getMediaSourceId())
    await janelaFundo.carregarJanela();

    let monitorResolucao = screen.getPrimaryDisplay().workAreaSize
    janelaFundo.janelaElectron.setBounds({ width: monitorResolucao.width, height: monitorResolucao.height, x: 0, y: 0 })
}

/**
 * Traz pra frente o foco da janela principal
 * @param {Boolean} boolean 
 */
async function mostraJanelaPrincipal(boolean) {
    if (boolean) {
        janelaPrincipal.show()
        await pausa(0.1)
        janelaPrincipal.moveTop()
        janelaPrincipal.webContents.send("FOCAR-CAMPO")
    } else {
        janelaFundo.janelaElectron.focus()
        janelaPrincipal.hide()
    }
}

/**
 * Altera as proporções da janela para o modo minimizado
 * @param {Boolean} boolean
 */
async function alterarParaModoMinimizado(boolean) {

    let tamanhoMonitor = screen.getPrimaryDisplay().workArea

    if (boolean) {
        log(`Setando janela para o modo minimizado!`);
        let novoWidth = 0.3 * tamanhoMonitor.width
        let novoHeigth = 0.10 * (tamanhoMonitor.height)

        let centroMonitorX = (tamanhoMonitor.width - novoWidth) / 2

        janelaPrincipal.setBounds({
            width: Math.floor(novoWidth),
            height: Math.floor(novoHeigth),
            y: 0,
            x: Math.floor(centroMonitorX)
        })
        janelaPrincipal.setOpacity(0.7)
    } else {
        log(`Voltando janela para o modo normal`);

        let centroMonitorX = (tamanhoMonitor.width - PropriedadesPrograma.JanelaPrincipal.Janela.width) / 2
        let centroMonitorY = (tamanhoMonitor.height - PropriedadesPrograma.JanelaPrincipal.Janela.heigth) / 2

        janelaPrincipal.setBounds({
            width: PropriedadesPrograma.JanelaPrincipal.Janela.width,
            height: PropriedadesPrograma.JanelaPrincipal.Janela.heigth,
            x: Math.floor(centroMonitorX),
            y: Math.floor(centroMonitorY)
        })
        janelaPrincipal.setOpacity(1)
    }
}

/**
 * Altera a opacidade da janela principal
 * @param {Number} novovalor 
 */
async function toggleOpacidadeJanelaPrincipal(novovalor) {
    janelaPrincipal.setOpacity(novovalor)
}

/**
 * Desabilita a interação de mouse e foco na janela principal, passando os eventos do mouse para a janela abaixo dela
 * @param {Boolean} bool Toggle sim ou nao
 */
async function toggleFocoJanelaPrincipal(bool) {
    janelaPrincipal.setFocusable(bool)
    janelaPrincipal.setIgnoreMouseEvents(!bool)
}

/**
 * Esconde ou mostra a janela principal(ela estando minimizada ou não)
 * @param {Boolean} bool 
 */
async function toggleMostrarJanelaPrincipal(bool) {
    if (bool) {
        janelaPrincipal.hide()
    } else {
        janelaPrincipal.show()
    }
}

/**
 * Traz pra frente a janela principal acima de todos os outros slots
 */
function priorizarFocoTelaPrincipal() {

    let possuiAlgumSlotFocado = false
    for (const slotFicha of slotsFichaTecnica.slotsFichas) {
        if (slotFicha.janelaElectron.isFocused()) possuiAlgumSlotFocado = true
    }

    if (slotJanelaProducao.slotProducao != undefined) {
        if (slotJanelaProducao.slotProducao.janelaElectron.isFocused()) possuiAlgumSlotFocado = true
    }


    if (janelaFundo.janelaElectron.isFocused()) possuiAlgumSlotFocado = true

    if (possuiAlgumSlotFocado) {
        janelaPrincipal.moveTop()
        // janelaPrincipal.setFocusable(true)
    }
}

/**
 * Retorna informações de uma aba
 * @param {Number} abaid 
 */
async function getAbaDados(abaid) {
    let requestAbaDados = await axios.get(`${PropriedadesPrograma.Backend.Url}/abas/${abaid}`)
    if (requestAbaDados.status == 200) {
        return requestAbaDados.data.dados.aba
    } else {
        undefined
    }
}


/**
 * Pausa o codigo por x tempo
 * @param {Number} tempo 
 */
async function pausa(tempo = 1) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, tempo * 1000)
    })
}