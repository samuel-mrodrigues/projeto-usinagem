import { app, BrowserWindow } from "electron"
import path from "path"
import fs from "fs"
import JSZip from "jszip"

/**
 * Propriedades gerais do programa
 */
export const PropriedadesPrograma = {
    /**
     * Informações da janela principal
     */
    JanelaPrincipal: {
        /**
         * Tamanho da janela
         */
        Janela: {
            width: 900,
            heigth: 800
        }
    },
    /**
     * Informações do backend para se comunicar
     */
    Backend: {
        /**
         * URL do endpoint
         */
        Url: `http://192.168.1.10:8003/projeto-usinagem`
        // Url: `http://localhost:8003/projeto-usinagem`
    },
    /**
     * Se a aplicação está rodando no modo desenvolvedor(rodando no electron:serve)
     */
    modoDev: true,
    /**
     * Tempo em minutos que o programa deve checar por atualizações novas
     */
    tempoMinutosParaAtualizar: 1
}

export function getSistemaOperacional() {
    return process.platform
}

/**
* Retorna o caminho do projeto
* Se o modo dev estiver ativado, será retornado a raiz da pasta do projeto(não a pasta dist_electron)
* No modo de produção será o mesmo resultado
*/
export function getDiretorioPrograma() {
    let estaModoDev = PropriedadesPrograma.modoDev

    let caminhoAppasar = app.getAppPath()
    caminhoAppasar = caminhoAppasar.replaceAll("\\", "/")

    let caminhoCorreto = caminhoAppasar
    if (estaModoDev == true) {
        caminhoCorreto = caminhoAppasar.substring(0, caminhoAppasar.indexOf("/dist_electron"))
    } else {
        caminhoCorreto = caminhoAppasar.substring(0, caminhoAppasar.indexOf("/resources"))
    }

    caminhoCorreto = path.resolve(caminhoCorreto)

    return caminhoCorreto
}

/**
 * Verifica se um caminho existe ate o fim
 * @param {String} caminho 
 */
export function existeCaminho(caminho) {
    console.log(`Existe caminho: ${caminho}`);
    try {
        fs.readdirSync(caminho)
    } catch (Exception) {
        console.log(`Diretorio ${caminho} não encontrado, criando sub-pastas necessarias`);
    }

    caminho = caminho.replace(getDiretorioPrograma(), "")

    let caminhoPartes = caminho.split("\\")
    let caminhoAtual = getDiretorioPrograma()

    for (let caminho of caminhoPartes) {
        if (caminho == "") continue;
        caminhoAtual = path.join(caminhoAtual, caminho)

        try {
            fs.readdirSync(caminhoAtual)
        } catch (Exception) {
            console.log(`Criando o diretorio (${caminhoAtual})`);
            fs.mkdirSync(caminhoAtual)
        }
    }
}

/**
 * Le um arquivo ZIP e retorna todos os arquivos contidos nele
 * @param {String} arquivoCaminho 
 * @return {Promise<[JSZip.JSZipObject]>}
 */
export async function lerArquivoZIP(arquivoCaminho) {
    console.log(`Descompactando arquivo ZIP: ${arquivoCaminho}`);
    return new Promise((resolve, reject) => {
        let arquivosDescomprimidos = []

        fs.readFile(arquivoCaminho, (err, data) => {
            if (err) {
                return arquivos
            }


            JSZip.loadAsync(data).then(zip => {
                for (let arquivo in zip.files) {

                    let arquivoDados = zip.file(arquivo)
                    if (arquivoDados == null) continue


                    arquivosDescomprimidos.push(arquivoDados)
                }

                resolve(arquivosDescomprimidos)
            })
        })
    })
}

/**
 * Pausa o codigo por x segundos
 * @param {Number} tempo Tempo em segundos (padrão será 1 se não informado)
 */
export async function pausa(tempo = 1) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, tempo * 1000);
    })
}

/**
 * Envia uma mensagem de notificação para a janela principal
 * @param {String} msg 
 * @param {Number} tempo 
 * @param {String} tipo 
 */
export function mostraNotificacao(msg = "", tempo = 0, tipo = "normal") {
    let janelaPrincipal = BrowserWindow.getAllWindows().find(janela => janela.JANELA_MASTER != undefined && janela.JANELA_MASTER == true)

    if (janelaPrincipal != undefined) {
        janelaPrincipal.webContents.send("MOSTRAR-NOTIFICACAO", { msg: msg, tempo: tempo, tipo: tipo })
    }
}