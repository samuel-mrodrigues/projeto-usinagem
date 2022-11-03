<style scoped src="./css/Inicio.css">

</style>

<template>
  <div>
    <div class="janelas-flutuantes">
      <MenuConfigurar v-if="janelasFlutuantes.menuConfigurar.aberta" v-on:fechar="fecharJanelaConfigurar"
        v-on:config-alterada="eventoConfigurarAlterado" />
    </div>

    <p class="titulo">FICHA TÉCNICA</p>
    <div class="digita-produto">
      <input style="margin-top: 20px" type="text" placeholder="HF 01..." v-model="produto_digitado"
        :disabled="$store.state.status.abrindo_slots || $store.state.status.fechando_slots" maxlength="12"
        ref="campo_produto" />
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

import { cadastrarListener, excluirListener } from "../../utils/Listeners/JsListeners.js"

import axios from "axios"

export default {
  name: "App",
  methods: {},
  components: { MenuConfigurar },
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
    async eventoConfigurarAlterado(dadosObjeto) {
      console.log(`Novos dados de configurações recebidos`);
      console.log(dadosObjeto);
      this.config.dadosConfigurados = dadosObjeto;
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

      let statusAbertura = await this.$store.dispatch("abrirJanelas", this.produto_digitado)
      this.$store.state.status.modoAutomatico = false
    },
    async abrirAutomatico() {
      let existeProdutoAtual = this.$store.getters.getProdutoAtual

      if (existeProdutoAtual != undefined) {
        let produtoCodigo = existeProdutoAtual.produto_codigo.replace("PIU", "")
        this.$store.state.status.modoAutomatico = true
        this.$store.dispatch("abrirJanelas", produtoCodigo)
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
