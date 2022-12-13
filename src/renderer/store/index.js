import { createStore } from 'vuex'
import { ipcRenderer } from "electron"
import { pausa } from "../utils/Utils.js"
import fs from "fs";
import path from "path";
import { removerReatividade } from "../utils/Utils.js"
import axios from 'axios';

export default createStore({
  state: {
    notificacao: {
      msg: "Teste haha",
      tipoMsg: "normal",
      tempoMostrar: 0,
      random: 1
    },
    configuracao: {

    },
    status: {
      abrindo_slots: false,
      slots_abertos: false,
      fechando_slots: false,
      modoMinimizado: false,
      modoAutomatico: false,
      ultimoProdutoDigitado: '',
      producaoPendentes: {
        listaProdutos: [],
        indexAberto: 0,
        taskidAtualizar: -1
      },
      /**
       * Informações da sessão atual
       */
      sessaoInfo: {
        modoAutomatico: false,
        ultimoProdutoAberto: {
          codigo: '',
          marca: {
            id: '',
            descricao: ''
          }
        },
        restaurarSessao: false
      }
    },
    backend_api: {
      url: 'http://192.168.1.10:8003/projeto-usinagem'
      // url: 'http://localhost:8003/projeto-usinagem'
    }
  },
  getters: {
    getProdutoAnterior(store) {
      let index = store.status.producaoPendentes.indexAberto - 1

      if (index < 0) index = store.status.producaoPendentes.listaProdutos.length - 1
      return store.status.producaoPendentes.listaProdutos[index]
    },
    getProdutoProximo(store) {
      let index = store.status.producaoPendentes.indexAberto + 1

      if (index > (store.status.producaoPendentes.listaProdutos.length - 1)) index = 0
      return store.status.producaoPendentes.listaProdutos[index]
    },
    getProdutoAtual(store) {
      let index = store.status.producaoPendentes.indexAberto

      return store.status.producaoPendentes.listaProdutos[index]
    }
  },
  mutations: {
  },
  actions: {
    /**
     * Mostra uma notificação 
     * @param {{msg: String, tipo: ('ok'|'erro'|'aviso'|'normal'), tempo: Number}} objetoMsg Props da mensagem
     */
    mostrarNotificacao(store, objetoMsg) {
      console.log(`Solicitado mostrar uma nova notificação`);
      if (objetoMsg.msg == undefined) {
        console.log(`Mensagem não especificada`);
      }

      let novaNotificacao = store.state.notificacao

      novaNotificacao.msg = objetoMsg.msg
      novaNotificacao.tipoMsg = objetoMsg.tipo != undefined ? objetoMsg.tipo : 'normal'
      novaNotificacao.tempoMostrar = objetoMsg.tempo != undefined ? objetoMsg.tempo : 3
      novaNotificacao.random = novaNotificacao.random + 1

      store.state.notificacao = novaNotificacao
    },
    /**
     * Alterar a config atual
     */
    setarConfig(store, objetoConfig) {
      console.log(`Definindo a configuração atual...`);
      console.log(objetoConfig);
      Object.assign(store.state.configuracao, objetoConfig)

      let pastaConfig = path.resolve("./", "configuracao")
      if (!fs.existsSync(pastaConfig)) fs.mkdirSync(pastaConfig)

      try {
        fs.writeFileSync(path.resolve(pastaConfig, "config.json"), JSON.stringify(removerReatividade({ ...store.state.configuracao })))

        store.dispatch("mostrarNotificacao", {
          msg: "Configurações salvas com sucesso",
          tipo: "ok",
          tempo: 5,
        });
      } catch (ex) {
        console.log(ex);
        console.log(`Erro ao salvar arquivo de configuração!`);
        store.dispatch("mostrarNotificacao", {
          msg: "Erro ao salvar alterações",
          tipo: "erro",
          tempo: 5,
        });
      }

      clearInterval(store.state.status.producaoPendentes.taskidAtualizar)
      store.dispatch("verificarCamposConfig")
      store.dispatch("iniciarTaskAtualizarOrdemProducao")
      store.dispatch("carregarOrdemProducao")
    },
    /**
     * Carregar o arquivo de configuração JSON
     */
    carregarConfigArquivo(store) {
      let pastaConfig = path.resolve("./", "configuracao")
      if (!fs.existsSync(pastaConfig)) fs.mkdirSync(pastaConfig)

      let arquivoConfig = path.resolve(pastaConfig, "config.json");

      if (fs.existsSync(arquivoConfig)) {
        try {
          let configJSON = fs.readFileSync(arquivoConfig, { encoding: "utf8" });
          store.dispatch("setarConfig", JSON.parse(configJSON));
        } catch (ex) {
          console.log(ex);
          console.log(`Erro ao carregar arquivo de configuração`);
        }
      } else {
        console.log(`Arquivo de config não existe, criando um padrão..`);

        store.dispatch("setarConfig", {
          usuarioIdExon: -1,
          abasConfiguradas: [],
          outros: {
            ativarEfeitos: false
          }
        });
      }

    },
    /**
     * Realiza uma verificação na config para garantir que todos os campos necessarios existam!
     */
    verificarCamposConfig(store) {
      if (store.state.configuracao.outros == undefined) store.state.configuracao.outros = {}
      if (store.state.configuracao.outros.ativarEfeitos == undefined) store.state.configuracao.outros.ativarEfeitos = false
    },
    /**
     * Altera a janela principal entre minimizado e normal
     * @param {Boolean} bool Ativar ou desativar
     */
    async toggleModoMinimizado(store, bool) {
      store.state.status.modoMinimizado = bool

      // Envia ao main para alterar as propriedades da janela
      await ipcRenderer.invoke("TOGGLE-MODO-MINIMIZADO", bool)
    },
    /**
     * Minimizar o programa
     */
    async minimizarPrograma() {
      await ipcRenderer.invoke("MINIMIZAR-PROGRAMA")
    },
    /**
     * Realiza a abertura dos slots
     * @param {{codigo: String, marca: {id: Number, descricao: String}}} produtoDados Dados do produto para mostrar
     * @return {Boolean} Status se conseguiu abrir os slots
     */
    async abrirJanelas(store, produtoDados) {
      if (store.state.status.abrindo_slots) {
        store.dispatch("mostrarNotificacao", {
          msg: "Aguarde a abertura!",
          tipo: "aviso",
          tempo: 3,
        });
        return false;
      }

      console.log(`Iniciando abertura das janelas...`);
      store.state.status.abrindo_slots = true;
      store.dispatch("mostrarNotificacao", {
        msg: "Iniciando abertura da ficha técnica...",
        tipo: "normal",
        tempo: 3,
      });

      await pausa(1);

      let configuracao = {
        janelas: removerReatividade(store.state.configuracao.abasConfiguradas),
        usuarioId: store.state.configuracao.usuarioIdExon,
        produto: {
          codigo: produtoDados.codigo,
          marca: produtoDados.marca
        },
        usarEfeitos: store.state.configuracao.outros.ativarEfeitos
      };
      console.log(configuracao);

      // Chama o handler do main que inicia as janelas
      let statusAbrirFicha = await ipcRenderer.invoke(
        "ABRIR-JANELAS",
        configuracao
      );

      if (statusAbrirFicha) {
        console.log(`Abertura concluida`);
        store.state.status.abrindo_slots = false;
        store.state.status.slots_abertos = true;

        store.dispatch("toggleModoMinimizado", true)
        store.state.status.sessaoInfo.ultimoProdutoAberto.codigo = produtoDados.codigo
        store.state.status.sessaoInfo.ultimoProdutoAberto.marca = produtoDados.marca
      } else {
        console.log(`Erro na abertura`);
        store.state.status.abrindo_slots = false;
        store.dispatch("toggleModoMinimizado", false)
      }

      // Salvar a sessão
      store.dispatch('salvarDadosSessao')
    },
    /**
     * Navega pelos produtos que existem nas OPs da linha configurada
     * @param {('avancar' | 'voltar')} qualProximo Avancar ou voltar produtos 
     * @returns 
     */
    async alterarProdutoAberto(store, qualProximo) {
      console.log(`Solicitado alterar produto, ${qualProximo}`);
      if (store.state.status.abrindo_slots || store.state.status.fechando_slots) {
        store.dispatch("mostrarNotificacao", { msg: "Não é possível trocar de produto agora!", tipo: "aviso", tempo: 5 })
        return;
      }

      let produtoObjeto = {}
      switch (qualProximo.toLowerCase()) {
        case "avancar":
          produtoObjeto = store.getters.getProdutoProximo
          store.dispatch("alterarIndexProdutoProximo")
          break;
        case "voltar":
          produtoObjeto = store.getters.getProdutoAnterior
          store.dispatch("alterarIndexProdutoAnterior")
          break;
        default:
          console.log(`Ação (${qualProximo}) não é valida`);
          return;
      }

      let produtoCodigo = produtoObjeto.produto_codigo.replace("PIU", "")
      let produtoMarcaDesc = produtoObjeto.marca_descricao
      let produtoMarcaId = produtoObjeto.marca_id

      await store.dispatch("abrirJanelas", { codigo: produtoCodigo, marca: { id: produtoMarcaId, descricao: produtoMarcaDesc } })
    },
    /**
     * Avança para o proximo produto na lista de ops
     */
    alterarIndexProdutoProximo(store) {
      let novoIndex = store.state.status.producaoPendentes.indexAberto + 1

      if (novoIndex > (store.state.status.producaoPendentes.listaProdutos.length - 1)) novoIndex = 0
      store.state.status.producaoPendentes.indexAberto = novoIndex
      console.log(`Avançando index para: ${novoIndex}`);
    },
    /**
     *  Volta para o produto na lista de ops
     */
    alterarIndexProdutoAnterior(store) {
      let novoIndex = store.state.status.producaoPendentes.indexAberto - 1

      if (novoIndex < 0) novoIndex = store.state.status.producaoPendentes.listaProdutos.length - 1
      store.state.status.producaoPendentes.indexAberto = novoIndex
      console.log(`Voltando index para: ${novoIndex}`);
    },
    /**
    * Carrega a ordem de produção dos produtos para o recurso configurado
    */
    async carregarOrdemProducao(store) {
      console.log(`Buscando ordem de produção do exon...`);

      let usuarioSetado = store.state.configuracao.usuarioIdExon
      if (usuarioSetado == -1) {
        console.log(`Ignorando busca de ordem de produção, pois o user ID não foi definido!`);
        return;
      }

      let usuarioDados = await axios.get(`${store.state.backend_api.url}/usuarios/${usuarioSetado}`)
      if (usuarioDados.status != 200) {
        console.log(requestProducaoOps.statusText);
        console.log(`Erro ao pegar dados de usuario id: ${usuarioSetado}`);
        return;
      }

      let usuarioObservacao = usuarioDados.data.dados.usuario.observacao
      let recursoDefinido = usuarioObservacao.replaceAll(" ", "").substring(usuarioObservacao.indexOf(":") + 1, 999)

      let requestProducaoOps = await axios.get(`${store.state.backend_api.url}/recursos/${recursoDefinido}/ops`)
      if (requestProducaoOps.status != 200) {
        console.log(requestProducaoOps.statusText);
        console.log(`Erro ao pegar ops do recurso ${recursoDefinido}`);

        store.state.status.producaoPendentes.listaProdutos = []
        store.state.status.producaoPendentes.indexAberto = 0
        return;
      }

      store.state.status.producaoPendentes.listaProdutos = requestProducaoOps.data.dados.ops
    },
    /**
     * Atualiza automaticamente a lista de ops do usuario atual 
     */
    iniciarTaskAtualizarOrdemProducao(store) {
      console.log(`Iniciando task para atualizar ordem de produção...`);
      if (store.state.status.producaoPendentes.taskidAtualizar != -1) clearInterval(store.state.status.producaoPendentes.taskidAtualizar)

      store.state.status.producaoPendentes.taskidAtualizar = setInterval(() => {
        store.dispatch("carregarOrdemProducao")
      }, (Math.random() * (140 - 120) + 120) * 1000);
    },
    /**
    * Fechar as janelas de consulta
    */
    async fecharJanelas(store) {
      console.log(`Fechando janelas...`);
      store.state.status.fechando_slots = true;

      let statusFechar = await ipcRenderer.invoke("FECHAR-JANELAS", { ativarEfeitos: store.state.configuracao.outros.ativarEfeitos });
      if (statusFechar) {
        console.log(`Janelas fechadas com sucesso`);
        store.state.status.fechando_slots = false;
        store.state.status.slots_abertos = false;

        store.state.status.modoMinimizado = false
        ipcRenderer.invoke("TOGGLE-MODO-MINIMIZADO", false)
      } else {
        console.log(`Erro ao fechar janelas`);
      }
    },
    /**
     * Verifica se existe alguma aba do tipo desejado
     * @param {String} abaTipo 
     * @return {Boolean}
     */
    existeAbaDoTipo(store, abaTipo) {
      let slotsConfigurados = store.state.configuracao.abasConfiguradas

      for (const linhasSlots of slotsConfigurados) {
        for (const slot of linhasSlots) {
          if (slot.tipo == abaTipo) {
            return true
          }
        }
      }

      return false
    },
    /**
     * Salva dados da sessão atual num arquivo de configuração
     */
    salvarDadosSessao(store) {
      let arquivoSessao = path.resolve("./", "sessao.json")

      fs.writeFileSync(arquivoSessao, JSON.stringify(store.state.status.sessaoInfo))
    },
    /**
     * Carrega o arquivo de sessão atual
     */
    async carregarSessaoAtual(store) {
      let arquivoSessao = path.resolve("./", "sessao.json")

      if (fs.existsSync(arquivoSessao)) {

        try {
          store.state.status.sessaoInfo = JSON.parse(fs.readFileSync(arquivoSessao))

          let dadosSessao = store.state.status.sessaoInfo
          console.log(dadosSessao);

          if (dadosSessao.restaurarSessao) {
            console.log(`Restaurando sessão anterior...`);
            dadosSessao.restaurarSessao = false

            if (dadosSessao.modoAutomatico) {
              store.state.status.modoAutomatico = true
            } else {
              store.state.status.modoAutomatico = false
            }

            await store.dispatch("abrirJanelas", { codigo: dadosSessao.ultimoProdutoAberto.codigo, marca: { id: dadosSessao.ultimoProdutoAberto.marca.id, descricao: dadosSessao.ultimoProdutoAberto.marca.descricao } })
          } else {
            console.log(`Não é necessario restaurar a ultima sessão...`);
          }
        } catch (ex) {
          console.log(ex);
          console.log(`Ocorreu um erro ao ler o arquivo de sessão`);
        }
      } else {
        console.log(`Arquivo de sessão não existe...`);
      }
    }
  },
  modules: {
  }
})
