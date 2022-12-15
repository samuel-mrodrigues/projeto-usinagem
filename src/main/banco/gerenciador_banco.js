// Esse arquivo é responsavél por gerenciar as conexões com banco de dados e tratar requisições do renderer ao banco
import BancoMicrosoftSQL from "../../utils/banco/mssql/mssql.js"
import { ipcMain } from "electron"

/**
 * Conexão ao banco do Exon
 */
var bancoExon = new BancoMicrosoftSQL({
    ip: "192.168.1.21",
    usuario: "sigadb",
    senha: "sigadb",
    database: "exon"
})

/**
 * Conexão ao banco do Protheus
 */
var bancoProtheus = new BancoMicrosoftSQL({
    ip: "192.168.1.21",
    usuario: "sigadb",
    senha: "sigadb",
    database: "DADOSADV"
})

var taskidFecharConexao = -1

/**
 * Realiza o cadastro iniciais do gerenciador de bancos
 */
export function cadastrarHandlersBanco() {
    console.log(`Gerenciador de bancos: Cadastrando handlers...`);

    ipcMain.handle("CONSULTAR-BANCO-EXON", async (evento, consutaObjeto = { query: '' }) => {
        console.log(`Renderer solicitou consulta ao banco exon!`);
        return await realizarQuery("exon", consutaObjeto.query)
    })

    ipcMain.handle("CONSULTAR-BANCO-PROTHEUS", async (evento, consutaObjeto = { query: '' }) => {
        console.log(`Renderer solicitou consulta ao banco protheus!`);
        return await realizarQuery("protheus", consutaObjeto.query)
    })
}

/**
 * Executar uma query em algum banco especifico
 * @param {('protheus' | 'exon')} bancoDesejado Banco para realizar a query
 * @param {String} querySql SQL para executar 
 */
export async function realizarQuery(bancoDesejado, querySql) {
    console.log(`Gerenciador de bancos: Nova requisição de consulta ao banco ${bancoDesejado}`);
    // O que será retornado
    let status_query = {
        sucesso: false,
        erro: null,
        resultado: []
    }

    let bancoSelecionado;
    switch (bancoDesejado.toLowerCase()) {
        case "exon":
            bancoSelecionado = bancoExon
            break;
        case "protheus":
            bancoSelecionado = bancoProtheus
            break;
        default:
            status_query.erro = `Banco especificado ${bancoDesejado} não é uma opção valida!`
            return status_query
    }

    if (taskidFecharConexao != -1) {
        console.log(`Cancelando fechamento de conexão..`);
        clearTimeout(taskidFecharConexao)
        taskidFecharConexao = -1
    }

    if (!bancoSelecionado.conectado()) {
        console.log(`Tentando conectar-se ao banco ${bancoDesejado}..`);

        await bancoSelecionado.conectarBanco()

        if (!bancoSelecionado.conectado()) {
            console.log(`Erro ao conectar-se ao banco...`);
            status_query.erro = `Falha ao conectar-se ao banco...`
            return status_query
        }
    }

    let executorQuery = await bancoSelecionado.querySimples()
    if (!executorQuery) {
        console.log(`Erro ao obter executor de querys!`);
        status_query.erro = "Erro ao obter executor de querys!"
        return status_query
    }

    let resultadoQuery = await executorQuery.executar(querySql)
    if (resultadoQuery.sucesso) {
        status_query.sucesso = true
        status_query.resultado = resultadoQuery.resultado
    } else {
        status_query.erro = resultadoQuery.erro
    }

    taskidFecharConexao = setTimeout(() => {
        console.log(`Gerenciador de banco: Fechando conexão ao banco por inatividade`);
        bancoSelecionado.fecharConexao()
    }, 50000);

    return status_query
}