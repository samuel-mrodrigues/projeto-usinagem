import superagent from "superagent"
import axios from "axios"
import { PropriedadesPrograma } from "../../utils/Utils.js"
import { ipcMain } from "electron"

export class SessaoExon {
    /**
     * @type {superagent.SuperAgentStatic & superagent.Request}
     */
    agente_sessao = undefined
    logado = false;
    login_dados = {
        usuario: "",
        senha: "",
        validado: false,
        userid: -1
    }

    constructor() {
        console.log(`Agente de sessão do Exon pronto`);
        this.agente_sessao =
            superagent.agent()

        this.cadastrarHandlersElectron();
    }

    /**
     * Cadastra handlers electron para o renderer interagir
     */
    cadastrarHandlersElectron() {
        ipcMain.handle("SESSAOEXON-EXISTEDESENHO", async (ev, linkdesenho) => {
            console.log(`Solicitado conferir se desenho existe`);
            return (await this.existeLinkDesenho(linkdesenho))
        })
    }

    async getDadosFichaProduto(produto_codigo) {
        let status_retorno = {
            sucesso: false,
            erro: '',
            conteudo: ''
        }

        if (!this.login_dados.validado) {
            status_retorno.erro = "ERRO: Recurso não definido"
            return status_retorno
        }

        for (let index = 0; index < 3; index++) {
            console.log(`${index + 1} tentativa de pegar ficha tecnica...`);
            try {
                let status = await this.agente_sessao.get(encodeURI(`http://192.168.1.8:81/ficha_tecnica/${produto_codigo}`))

                if (status.text.indexOf(`Visualizar Ficha Técnica`) != -1) {
                    status_retorno.sucesso = true
                    status_retorno.conteudo = status.text
                    return status_retorno
                } else {
                    status_retorno.erro = "Não foi possível obter pagina da ficha do produto"
                }

            } catch (erro) {
                status_retorno.erro = `Ficha do produto não cadastrada!`
            }
        }

        return status_retorno
    }

    /**
     * Verifica se o link de algum desenho existe
     * @param {String} linkDesenho 
     * @returns {Promise<{sucesso: Boolean, erro: String, existe: Boolean}>} True/false se o desenho existir 
     */
    async existeLinkDesenho(linkDesenho) {
        console.log(`Verificando se o link (${linkDesenho} existe)`);
        let status_retorno = {
            sucesso: false,
            erro: '',
            existe: false
        }

        if (!this.login_dados.validado) {
            status_retorno.erro = "ERRO: Recurso não definido"
            return status_retorno
        }

        let status;
        try {
            status = await this.agente_sessao.get(linkDesenho)
        } catch (ex) {
            status_retorno.sucesso = true;
            status_retorno.existe = false;
            return status_retorno;
        }

        if (status.statusCode == 200) {
            status_retorno.existe = true;
        } else {
            status_retorno.existe = false;
        }

        return status_retorno;
    }

    async getTelaProducao() {
        let status_retorno = {
            sucesso: false,
            erro: '',
            conteudo: ''
        }

        if (!this.login_dados.validado) {
            status_retorno.erro = "ERRO: Recurso não definido"
            return status_retorno
        }

        try {
            let tela = await this.agente_sessao.get(encodeURI(`http://192.168.1.8:81/balanceamento_producao_v2`))

            if (tela.text.indexOf("Balanceamento de Produção V2") != -1) {
                status_retorno.sucesso = true
                status_retorno.conteudo = tela.text
                return status_retorno
            } else {
                status_retorno.erro = "Não foi possível obter pagina de produção..."
            }
        } catch (erro) {
            status_retorno.erro = "Erro ao consultar pagina de produção..."
        }

        return status_retorno;
    }

    async iniciarLogin() {
        let status_retorno = {
            sucesso: false,
            erro: ''
        }

        console.log(`Iniciando login no site Exon`);
        let pagina_login;
        try {
            pagina_login = await this.agente_sessao.get(`http://192.168.1.8:81/login`)
        } catch (ex) {
            console.log(`Erro ao requisitar login com o Exon...`);
            status_retorno.erro = "ERRO: Erro ao conectar-se ao Exon, verifique sua conexão de rede..."
            return status_retorno
        }

        console.log(`Carregando pagina inicial...`);
        let token_informacao = pagina_login.text.indexOf(`input type="hidden" name="_token" value=`);
        let frase_contendo_token = pagina_login.text.substring(token_informacao, token_informacao + 150).replace(/[\r\n]/gm, '').replaceAll(" ", "")
        let token = frase_contendo_token.substring(frase_contendo_token.indexOf("value") + 7, frase_contendo_token.lastIndexOf("><divclass") - 1)

        console.log(`Token de login encontrado: ${token}`);
        console.log(`Enviando requisição de login...`);

        try {
            let solicita_login = await this.agente_sessao.post(`http://192.168.1.8:81/login`)
                .send({ '_token': token, 'login': `${this.login_dados.usuario}`, 'password': `${this.login_dados.senha}` })
                .set(`Content-Type`, 'application/x-www-form-urlencoded')

            if (solicita_login.text.indexOf("senha inválidos") == -1) {
                console.log(`Requisição de login aprovada com sucesso`);
                this.logado = true
                status_retorno.sucesso = true
            } else {
                console.log(`Informações de login incorretas...`);
                this.logado = false
                status_retorno.erro = "ERRO: Verifique o usuario defnido nas configurações"
            }
        } catch (ex) {
            this.logado = false
            status_retorno.erro = "ERRO: Erro ao conectar-se ao Exon, tente novamente..."
            status_retorno.sucesso = false
            this.agente_sessao = superagent.agent()
        }

        return status_retorno
    }

    /**
     * Define qual login será usado para acessar o Exon
     * @param {String} recursoLinha
     */
    async definirLogin(recursoLinha) {
        if (this.login_dados.validado && this.login_dados.userid == recursoLinha) return;

        this.logado = false
        console.log(`Procurando informações do usuario id ${recursoLinha} no Exon`);

        let requestUsuario;
        try {
            requestUsuario = await axios.get(`${PropriedadesPrograma.Backend.Url}/usuarios/${recursoLinha}`)
        } catch (ex) {
            this.login_dados.validado = false
            return;
        }

        console.log(requestUsuario.data);
        if (requestUsuario.status == 200) {
            if (requestUsuario.data.sucesso) {
                let usuarioDados = requestUsuario.data.dados.usuario

                this.login_dados.usuario = usuarioDados.login
                this.login_dados.senha = "1234"
                this.login_dados.validado = true
                this.login_dados.userid = recursoLinha
                console.log(this.login_dados);
            } else {
                this.login_dados.validado = false
            }
        } else {
            this.login_dados.validado = false
        }
    }
}