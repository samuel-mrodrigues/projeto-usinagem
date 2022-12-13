<style src="./css/App.css">

</style>

<template>
  <ModoMinimizado v-if="$store.state.status.modoMinimizado" />

  <span v-else>
    <img src="./assets/logo-hf.png" width="500" />
    <NotificacaoApp />
    <Inicio />
  </span>
</template>

<script>
/* eslint-disable */
import { ipcRenderer } from "electron"


import Inicio from "./componentes/Inicio/Inicio.vue";
import NotificacaoApp from "./componentes/NotificacaoApp/NotificacaoApp.vue";
import ModoMinimizado from "./componentes/ModoMinimizado/ModoMinimizado.vue";


export default {
  name: "App",
  data() {
    return {
    };
  },
  async mounted() {
    // Quando o main quiser mostrar alguma notificação, cadastro o handler aqui
    ipcRenderer.on(
      "MOSTRAR-NOTIFICACAO",
      (evento, msgObjeto = { msg: "", tempo: 0, tipo: "normal" }) => {
        this.$store.dispatch("mostrarNotificacao", msgObjeto);
      }
    );

    ipcRenderer.on("LOG-CONSOLE", (evento, mensagemString) => {
      console.log(`--[MAIN ENVIOU LOG]--`);
      console.log(mensagemString);
    })

    // O renderer irá chamar essa função quando o usuario pressionar o atalho de tecla para troca de produto
    ipcRenderer.on("ALTERAR-PRODUTO", async (evento, qualProximo) => {
      console.log(`Solicitado troca de produto para ${qualProximo}`);

      this.$store.dispatch("alterarProdutoAberto", qualProximo)
    })

    // Altera entre o modo minimizado e o modo normal que permite configurar e troca o produto
    ipcRenderer.on("TOGGLE-MODO-MINIMIZADO", async (evento) => {
      if (this.$store.state.status.slots_abertos == false) {
        this.$store.dispatch("mostrarNotificacao", { msg: 'É preciso ter alguma ficha aberta para altenar os menus', tipo: "aviso", tempo: 5 })
        return;
      }

      let estaMinimizado = this.$store.state.status.modoMinimizado

      if (estaMinimizado) {
        this.$store.state.status.modoMinimizado = false

        await ipcRenderer.invoke("TOGGLE-MODO-MINIMIZADO", false)
      } else {
        this.$store.state.status.modoMinimizado = true

        await ipcRenderer.invoke("TOGGLE-MODO-MINIMIZADO", true)
      }
    })

    // Carrega o arquivo JSON de configuração
    await this.carregarConfig()

    // Carregar a sessão atual se precisar...
    await this.$store.dispatch("carregarSessaoAtual")
  },
  methods: {
    /**
     * Solicita abrir a ficha do primeiro produto na ordem de produção...
     */
    // abrirPrimeiroProduto() {
    //   let existeProdutoAtual = this.$store.getters.getProdutoAtual

    //   if (existeProdutoAtual != undefined) {
    //     let produtoCodigo = existeProdutoAtual.produto_codigo.replace("PIU", "")
    //     this.$store.dispatch("abrirJanelas", produtoCodigo)
    //   }
    // },
    /**
     * Carregar o arquivo JSON de configuração
     */
    async carregarConfig() {
      this.$store.dispatch("carregarConfigArquivo")
    },
  },
  components: { Inicio, NotificacaoApp, ModoMinimizado },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>