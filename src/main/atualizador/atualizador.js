// Arquivo responsavél por checar as atualizações
import { getDiretorioPrograma, mostraNotificacao, existeCaminho, PropriedadesPrograma, lerArquivoZIP, pausa, getSistemaOperacional } from "../../utils/Utils.js"
import fs from "original-fs"
import axios from "axios"
import { app } from "electron"
import path from "path"

/**
 * Informações da versão atual do programa
 * @type {{versao: String, nome: String}}
 */
let informacoesUpdateAtual = {}

/**
 * ID do setInterval para cancelar ele ou algo assim
 */
let taskidIntervaloCheck = -1;

/**
 * Alguns status para controle das funções de atualizar
 */
let status = {
    estaAtualizando: false
}

let sistemaOperacional = getSistemaOperacional()

/**
 * Iniciar o atualizador
 */
export function iniciarAtualizador() {
    console.log(`Iniciando atualizador...`);
    carregarUpdateAtual()
    iniciarChecador()

    // Já faz uma verificação por atualizações...
    verificarExisteAtualizacao()
}

/**
 * Carrega o arquivo local para chegcar em qual atualização o programa se encontra
 */
function carregarUpdateAtual() {
    try {
        let jsonInfo = JSON.parse(fs.readFileSync(path.resolve(getDiretorioPrograma(), 'info.json')))

        informacoesUpdateAtual = jsonInfo.update_atual
    } catch (ex) {
        console.log(ex);
        console.log(`Ocorreu um erro ao carregar arquivo de info do programa`);
    }
}

/**
 * Inicia o intervalo de atualização do programa
 */
function iniciarChecador() {
    if (taskidIntervaloCheck != -1) clearInterval(taskidIntervaloCheck)

    taskidIntervaloCheck = setInterval(async () => {
        await verificarExisteAtualizacao()
    }, (PropriedadesPrograma.tempoMinutosParaAtualizar * 60) * 1000);
}

/**
 * Realiza a verificação para ver se existe uma nova atualização
 */
async function verificarExisteAtualizacao() {
    console.log(`Checando por atualizações...`);

    let requestVersaoRecente = await axios.get(`${PropriedadesPrograma.Backend.Url}/updates`)
    if (requestVersaoRecente.status != 200) {
        console.log(`Erro ao checar por atualizações...`);
        return;
    }

    let dadosAtualizacao = requestVersaoRecente.data.dados.update

    if (status.estaAtualizando) {
        console.log(`Atualização em progresso... ignorando verificação`);
        return;
    }

    if (dadosAtualizacao.versao != informacoesUpdateAtual.versao) {
        status.estaAtualizando = true
        console.log(`Nova atualização disponível! Versão nova: ${dadosAtualizacao.versao}, versao atual: ${informacoesUpdateAtual.versao == undefined ? 'Sem versão' : informacoesUpdateAtual.versao}`);
        mostraNotificacao(`Nova atualização encontrada, versão ${dadosAtualizacao.versao}`, 3)
        await pausa(3)
        atualizarAgora(dadosAtualizacao)
    }
}

/**
 * Inicia o download dos arquivos novos e atualiza automaticamente para a versão mais recente....
 * 
 */
async function atualizarAgora(novaVersao) {
    mostraNotificacao(`Iniciando atualização...`, 2)
    await pausa(3)

    mostraNotificacao(`Baixando novos arquivos do servidor...`, 2)
    // Requisita o download do arquivo compactato ZIP
    let requestDownloadUpdate = await axios.get(`${PropriedadesPrograma.Backend.Url}/updates/download?versao=${sistemaOperacional}`, {
        responseType: "arraybuffer"
    })

    await pausa(2)

    // Verifica se o direito temporario onde irei salvar existe
    let diretorioTemporario = path.resolve(getDiretorioPrograma(), 'temporario', 'atualizacoes')
    existeCaminho(diretorioTemporario)

    // Salva o arquivo temporariamente
    fs.writeFileSync(path.resolve(diretorioTemporario, 'atualizacao.zip'), requestDownloadUpdate.data, { encoding: "utf-8" })

    // Recebe todos os arquivos dentro do ZIP
    let arquivosDescompactados = await lerArquivoZIP(path.resolve(diretorioTemporario, 'atualizacao.zip'))

    mostraNotificacao(`Atualizando os arquivos`, 5)

    // Passa por cada arquivo existente e salva em seu lugar correto
    arquivosDescompactados.forEach(arquivoDados => {
        arquivoDados.name = arquivoDados.name.replaceAll("/", "\\")

        let pastaArquivo = arquivoDados.name.substring(0, arquivoDados.name.lastIndexOf("\\"))
        let arquivoNome = arquivoDados.name.substring(arquivoDados.name.lastIndexOf("\\") + 1, arquivoDados.name.length)

        let localSalvamento = path.resolve(getDiretorioPrograma(), pastaArquivo)

        existeCaminho(localSalvamento)
        // Salvar o arquivo nos lugares novos
        // arquivoDados.nodeStream().pipe(fs.createWriteStream(`${localSalvamento}\\${arquivoNome}`))
        arquivoDados.nodeStream().pipe(fs.createWriteStream(path.resolve(localSalvamento, arquivoNome)))
    })
    await pausa(3)

    // Atualizar o arquivo de info para a versão atualizada
    informacoesUpdateAtual.versao = novaVersao.versao
    informacoesUpdateAtual.nome = novaVersao.nome
    fs.writeFileSync(path.resolve(getDiretorioPrograma(), 'info.json'), JSON.stringify({
        update_atual: {
            nome: novaVersao.nome,
            versao: novaVersao.versao
        }
    }))

    mostraNotificacao(`Atualização concluida, reiniciando programa em 3 segundos...`, 3)
    await pausa(3)
    reiniciar()
}

// Reiniciar o programa
function reiniciar() {
    app.relaunch()
    app.exit()
}