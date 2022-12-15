<style scoped src="./css/Inicio.css">

</style>

<template>
  <div>
    <div class="janelas-flutuantes">
      <MenuConfigurar v-if="janelasFlutuantes.menuConfigurar.aberta" v-on:fechar="fecharJanelaConfigurar"
        v-on:config-alterada="eventoConfigurarAlterado" />
    </div>

    <p class="titulo" @click="teste()">FICHA TÉCNICA</p>
    <div class="digita-produto">
      <div @mouseenter="toggleTecladoVirtual(true)" @mouseleave="toggleTecladoVirtual(false)">
        <input style="margin-top: 20px" type="text" placeholder="HF 01..." v-model="produto_digitado"
          :disabled="$store.state.status.abrindo_slots || $store.state.status.fechando_slots" maxlength="12"
          ref="campo_produto" />

        <div class="teclado-virtual" v-if="tecladoVirtual.mostrar">
          <TecladoVirtualVue v-on:tecla-digitada="(tecla) => produto_digitado += tecla"
            v-on:apagar="() => produto_digitado = produto_digitado.substring(0, produto_digitado.length - 1)"
            v-on:tecla="teste" />
        </div>

      </div>
      <button class="botao-grande" @click="solicitarAbrirJanelas()"
        :disabled="$store.state.status.abrindo_slots || $store.state.status.fechando_slots" title="Inicia consulta">
        CONSULTAR
      </button>
    </div>
    <div class="acoes">
      <button class="botao-grande" @click="abrirAutomatico()"
        :disabled="$store.state.status.abrindo_slots || $store.state.status.fechando_slots"
        title="Abrir automaticamente a ficha da linha configurada">
        AUTOMÁTICO
      </button>

      <button class="botao-grande" title="Fechar a consulta" @click="solicitarFecharJanelas()"
        :disabled="!$store.state.status.slots_abertos">
        FECHAR JANELAS
      </button>

      <button @click="abrirMenuConfigurar()" class="botao-grande" title="Configurar os slots" :disabled="
        $store.state.status.abrindo_slots || $store.state.status.fechando_slots || $store.state.status.slots_abertos
      ">
        CONFIGURAR
      </button>

      <button @click="fecharPrograma()" class="botao-grande erro" title="Fechar o programa" id="sair">
        SAIR
      </button>

      <button v-if="$store.state.status.slots_abertos" @click="$store.dispatch('toggleModoMinimizado', true)"
        class="botao-grande" id="voltar">
        VOLTAR
      </button>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import { ipcRenderer } from "electron";
import MenuConfigurar from "../ConfiguraAbas/MenuConfigurar/MenuConfigurar.vue";
import TecladoVirtualVue from "../TeladoVirtual/TecladoVirtual.vue";
import { cadastrarListener, excluirListener } from "../../utils/Listeners/JsListeners.js"
import axios from "axios";

export default {
  name: "App",
  components: { MenuConfigurar, TecladoVirtualVue },
  data() {
    return {
      produto_digitado: "",
      janelasFlutuantes: {
        menuConfigurar: {
          aberta: false,
        },
      },
      config: {
        dadosConfigurados: {},
      },
      listenersAtivos: {
        apertouEnter: -1
      },
      tecladoVirtual: {
        mostrar: false
      }
    };
  },
  mounted() {
    // Abrir janelas quando o usuario apertar a telca enter na janela
    this.listenersAtivos.apertouEnter = cadastrarListener('onkeydown', (eventoTecla) => {
      if (eventoTecla.key.toLowerCase() == "enter") {
        this.solicitarAbrirJanelas()
      }
    })

    // Solicitar o foco do campo de digitar o produto
    ipcRenderer.on("FOCAR-CAMPO", (ev) => {
      this.focarCampoProduto();
    });

    this.focarCampoProduto();
    this.config.dadosConfigurados = this.$store.state.configuracao
  },
  unmounted() {
    excluirListener(this.listenersAtivos.apertouEnter)
    this
  },
  watch: {
    produto_digitado(novo) {
      this.produto_digitado = novo.toUpperCase();
    },
  },
  computed: {
    existeJanelasAbertas() {
      let janelas = [];
      for (const janela in this.janelasFlutuantes) {
        if (this.janelasFlutuantes[janela].aberta) {
          janelas.push(janela);
        }
      }

      return janelas.length != 0;
    },
  },
  methods: {
    async teste() {
      console.log("--------------------------------------");
      let existe = await ipcRenderer.invoke("SESSAOEXON-EXISTEDESENHO", `http://192.168.1.8:81/desenhos_producao/Exon/DESENHOS%20SEPARADOS/HF%2020/RET%C3%8DFdICA.pdf`)

      console.log(existe);
      console.log("--------------------------------------");
    },
    async eventoConfigurarAlterado(dadosObjeto) {
      console.log(`Novos dados de configurações recebidos`);
      console.log(dadosObjeto);
      this.config.dadosConfigurados = dadosObjeto;
    },
    /**
     * Mostra ou oculta o teclado virtual para digitar o produto
     * @param {Boolean} bool Mostrar ou ocultar
     */
    toggleTecladoVirtual(bool) {
      this.tecladoVirtual.mostrar = bool
    },
    fecharJanelaConfigurar() {
      this.janelasFlutuantes.menuConfigurar.aberta = false;
    },
    abrirMenuConfigurar() {
      let aberto = this.janelasFlutuantes.menuConfigurar.aberta;
      this.janelasFlutuantes.menuConfigurar.aberta = !aberto;
    },
    focarCampoProduto() {
      if (this.$refs.campo_produto != null) this.$refs.campo_produto.focus();
    },
    async solicitarAbrirJanelas() {
      console.log(`Solicitando abertura de janelas...`);

      if (this.produto_digitado == "" || this.produto_digitado.length <= 3) {
        this.$store.dispatch("mostrarNotificacao", {
          msg: "Digite um produto válido!",
          tipo: "erro",
          tempo: 5,
        });
        return;
      }

      this.$store.state.status.modoAutomatico = false
      this.$store.state.status.sessaoInfo.modoAutomatico = false
      this.$store.state.status.ultimoProdutoDigitado = this.produto_digitado
      await this.$store.dispatch("abrirJanelas", { codigo: this.produto_digitado, marca: { id: -1, descricao: "" } })
    },
    async abrirAutomatico() {
      let existeProdutoAtual = this.$store.getters.getProdutoAtual

      if (existeProdutoAtual != undefined) {
        let produtoCodigo = existeProdutoAtual.produto_codigo.replace("PIU", "")
        let produtoMarcaId = existeProdutoAtual.marca_id
        let produtoMarcaDesc = existeProdutoAtual.marca_descricao

        this.$store.state.status.modoAutomatico = true
        this.$store.state.status.sessaoInfo.modoAutomatico = true
        this.$store.dispatch("abrirJanelas", { codigo: produtoCodigo, marca: { id: produtoMarcaId, descricao: produtoMarcaDesc } })
      } else {
        this.$store.dispatch("mostrarNotificacao", {
          msg: "Não foi possível pegar as OPs desse recurso!",
          tipo: "erro",
          tempo: 5,
        });
      }
    },
    solicitarFecharJanelas() {
      console.log(`Solicitado fechamento das janelas...`);

      this.$store.dispatch("fecharJanelas")
    },
    fecharPrograma() {
      ipcRenderer.invoke("FECHAR-PROGRAMA")
    },
    /**
     * Pausa o codigo por x segundos
     */
    async pausa(seg) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, seg * 1000);
      });
    },
  },
};
</script>
