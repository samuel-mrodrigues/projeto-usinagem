<template>
  <div class="editando">
    <p class="titulo">Editar slot</p>

    <div class="campos">
      <div class="campo">
        <span class="questao">Nome do Slot:</span>
        <span class="opcao">
          <input type="text" v-model="editando.colunaObjeto.nome" />
        </span>
      </div>

      <div class="campo">
        <span class="questao">Mostrar:</span>
        <span class="opcao">
          <select v-model="conteudoSelecionado">
            <option value="vazio">Tela vazia</option>
            <option value="ficha_tecnica">Aba da Ficha Técnica</option>
            <option value="tela_producao">Tela de Produção</option>
          </select>
        </span>
      </div>

      <div class="campo" v-if="conteudoSelecionado == 'ficha_tecnica'">
        <span class="questao">Selecione a aba: </span>
        <span class="opcao">
          <select v-model="opcoesPossiveis.fichaTecnica.aba_id">
            <option v-for="(aba, key_aba) in opcoesDisponiveis.abasFichaTecnica" v-bind:key="key_aba" :value="aba.id">
              {{ aba.descricao }}
            </option>
          </select>
        </span>
      </div>

      <div class="campo" v-if="conteudoSelecionado == 'ficha_tecnica'">
        <span class="questao">Abrir desenhos automaticos?</span>
        <span class="opcao">
          <select v-model="opcoesPossiveis.fichaTecnica.abrirDesenhosAutomatico">
            <option :value="true">Sim</option>
            <option :value="false">Não</option>
          </select>
        </span>
      </div>

    </div>
    <div class="acoes">
      <button @click="salvar()" class="botao botao-ok" title="Salvar mudanças">
        Salvar
      </button>
      <button @click="cancelar()" class="botao botao-cancelar" title="Cancelar mudanças">
        Cancelar
      </button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
export default {
  props: {
    propColunaObjeto: {
      type: Object,
      default: () => { },
    },
    propLinha: {
      type: Number,
      default: -1,
    },
    propColuna: {
      type: Number,
      default: -1,
    },
  },
  data() {
    return {
      editando: {
        colunaObjeto: this.propColunaObjeto,
        linhaEditando: this.propLinha,
        colunaEditando: this.propColuna,
      },
      conteudoSelecionado: this.propColunaObjeto.tipo,
      opcoesDisponiveis: {
        abasFichaTecnica: [],
      },
      opcoesPossiveis: {
        vazio: {},
        fichaTecnica: {
          aba_id: '',
          abrirDesenhosAutomatico: ''
        },
      },
    };
  },
  mounted() {
    this.getAbasFichaTecnica();

    if (this.propColunaObjeto.propriedades != undefined) {
      let aba_id = this.propColunaObjeto.propriedades.aba_id != undefined ? this.propColunaObjeto.propriedades.aba_id : -1
      let abrirAutomatico = this.propColunaObjeto.propriedades.abrirDesenhosAutomatico != undefined ? this.propColunaObjeto.propriedades.abrirDesenhosAutomatico : false

      this.opcoesPossiveis.fichaTecnica.aba_id = aba_id
      this.opcoesPossiveis.fichaTecnica.abrirDesenhosAutomatico = abrirAutomatico
    }
  },
  watch: {
    "editando.colunaObjeto.nome"(novo) {
      this.editando.colunaObjeto.nome = novo.toUpperCase();
    },
    conteudoSelecionado(novo, antigo) {
      switch (novo) {
        case "ficha_tecnica": {
          let usuarioId = this.$store.state.configuracao.usuarioIdExon;

          if (usuarioId == -1) {
            this.$store.dispatch("mostrarNotificacao", {
              msg: "O recurso precisa ser preenchida para usar as abas de ficha!",
              tipo: "erro",
              tempo: 5,
            });
            this.conteudoSelecionado = antigo
          }
          break;
        }
        case "tela_producao": {
          let exiteSlotProducao = this.jaExisteTelaProducao()
          if (exiteSlotProducao != undefined) {

            this.$store.dispatch("mostrarNotificacao", {
              msg: `O slot ${exiteSlotProducao.nome} já esta definido como tipo produção!`,
              tipo: "erro",
              tempo: 4,
            });
            this.conteudoSelecionado = antigo
          }
          break;
        }
      }
    }
  },
  methods: {
    salvar() {
      if (this.existeSlotComNome(this.editando.colunaObjeto.nome)) {
        this.$store.dispatch("mostrarNotificacao", {
          msg: "Nome já usado em outro slot!",
          tipo: "erro",
          tempo: 5,
        });
        return;
      }

      let tipo_tela = {
        tipo: "vazio",
        nomeJanela: "",
        propriedades: {},
      };

      tipo_tela.nomeJanela = this.editando.colunaObjeto.nome;
      switch (this.conteudoSelecionado) {
        case "":
          tipo_tela.tipo = "vazio";
          break;
        case "ficha_tecnica":
          tipo_tela.tipo = "ficha_tecnica";
          tipo_tela.propriedades.aba_id =
            this.opcoesPossiveis.fichaTecnica.aba_id;
          tipo_tela.propriedades.abrirDesenhosAutomatico = this.opcoesPossiveis.fichaTecnica.abrirDesenhosAutomatico
          break;
        case "tela_producao":
          tipo_tela.tipo = "tela_producao";
          break;
      }

      this.$emit("salvar", tipo_tela);
    },
    /**
     * Verificar se já existe algum slot com o nome sendo salvo
     */
    existeSlotComNome(nomeSlot) {
      let slotsConfigurados = this.$store.state.configuracao.abasConfiguradas;

      let existeNome = false;
      for (
        let linhaSlotIndex = 0;
        linhaSlotIndex < slotsConfigurados.length;
        linhaSlotIndex++
      ) {
        for (
          let slotConfiguradoIndex = 0;
          slotConfiguradoIndex < slotsConfigurados[linhaSlotIndex].length;
          slotConfiguradoIndex++
        ) {
          if (
            linhaSlotIndex == this.editando.linhaEditando &&
            slotConfiguradoIndex == this.editando.colunaEditando
          )
            continue;

          const slotConfigurado =
            slotsConfigurados[linhaSlotIndex][slotConfiguradoIndex];

          if (slotConfigurado.nome.toUpperCase() == nomeSlot.toUpperCase()) {
            existeNome = true;
            break;
          }
        }

        if (existeNome) break;
      }

      console.log(`Existe nome? ${existeNome}`);
      return existeNome;
    },
    cancelar() {
      this.$emit("cancelar");
    },
    selecionaFichaExon(fichaId) {
      console.log(`Usuario selecionou a aba da ficha`);
      this.opcoesPossiveis.fichaTecnica.aba_id = fichaId;
    },
    async getAbasFichaTecnica() {
      console.log(`Recuperando lista de abas da ficha tecnica...`);

      let usuarioId = this.$store.state.configuracao.usuarioIdExon;
      let requestAbasUsuario = await axios.get(`${this.$store.state.backend_api.url}/usuarios/${usuarioId}/abas`)
      if (requestAbasUsuario.status != 200) {
        console.log(`Erro ao recuperar lista de abas para o usuario id: ${usuarioId}`);
        return;
      }

      this.opcoesDisponiveis.abasFichaTecnica = requestAbasUsuario.data.dados.abas;
    },
    /**
     * Retorna se já existe algum slot com o tipo de tela de produção
     * @return {{}}
     */
    jaExisteTelaProducao() {
      let slotsConfigurados = this.$store.state.configuracao.abasConfiguradas
      console.log(slotsConfigurados);

      for (const linhasSlots of slotsConfigurados) {
        for (const slot of linhasSlots) {
          console.log(slot);
          if (slot.tipo == "tela_producao") {
            return slot
          }
        }
      }
      return undefined
    },
  },
};
</script>

<style scoped src="./css/EditarColuna.css">

</style>
