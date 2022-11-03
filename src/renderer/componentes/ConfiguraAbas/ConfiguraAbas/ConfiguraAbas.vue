<template>
  <div class="configurar-abas">
    <div class="janelas-flutuantes">
      <EditarColuna v-if="janelasFlutuantes.editandoColuna.aberto"
        :propColunaObjeto="janelasFlutuantes.editandoColuna.colunaDados"
        :propLinha="janelasFlutuantes.editandoColuna.linha" :propColuna="janelasFlutuantes.editandoColuna.coluna"
        v-on:cancelar="eventoCancelaEdicao" v-on:salvar="eventoEditouColuna" />
    </div>
    <div class="tela">
      <p class="subtitulo" style="display: inline-block">Slots</p>
      <span class="icone-duvida" title="Define quais telas serão mostradas">?</span>

      <div class="tela-area">
        <span v-if="telasConfiguradas.length == 0" class="nenhuma-tela">
          Nenhum slot configurado.
        </span>
        <span v-else>
          <div class="linha" v-for="(linha, key_linha) in telasConfiguradas" v-bind:key="key_linha"
            :ref="`linha-${key_linha}`">
            <div class="slots">
              <div class="colunas">
                <div class="coluna" v-for="(coluna, key_coluna) in linha" v-bind:key="key_coluna">
                  <p>{{ coluna.nome }}</p>

                  <div class="acoes">
                    <button @click="editar(key_linha, key_coluna, coluna)" class="botao botao-aviso"
                      title="Editar informações desse slot">
                      Editar slot
                    </button>

                    <button @click="removeColuna(key_linha, key_coluna)" class="botao botao-cancelar"
                      title="Excluir slot">
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="acoes">
              <button @click="addColuna(key_linha)" class="botao botao-ok" title="Adicionar um novo slot">
                +Novo slot
              </button>
              <button @click="excluirLinha(key_linha)" class="botao botao-cancelar"
                title="Excluir toda a linha, isso irá remover todos os slots nessa linha!">
                -Excluir Linha
              </button>
            </div>
          </div>
        </span>
      </div>

      <div class="acoes">
        <button @click="addLinha()" class="botao botao-ok">+Nova Linha</button>
      </div>
    </div>
  </div>
</template>

<script>
import { toRaw } from "@vue/reactivity";
/* eslint-disable */
import EditarColuna from "./EditarColuna/EditarColuna.vue";

export default {
  components: {
    EditarColuna,
  },
  props: {
    propAbasCarregadas: {
      type: Array,
      default: () => [[]],
    },
  },

  mounted() {
    console.log(`Montando configurador de abas`);

    for (const linha in this.propAbasCarregadas) {
      this.telasConfiguradas.push(this.propAbasCarregadas[linha]);
    }
  },
  data() {
    return {
      telasConfiguradas: [],
      janelasFlutuantes: {
        editandoColuna: {
          aberto: false,
          linha: null,
          coluna: null,
          colunaDados: {},
        },
      },
    };
  },
  methods: {
    editar(linha, coluna, colunaObj) {
      this.janelasFlutuantes.editandoColuna.linha = linha;
      this.janelasFlutuantes.editandoColuna.coluna = coluna;
      this.janelasFlutuantes.editandoColuna.colunaDados = { ...colunaObj };
      this.janelasFlutuantes.editandoColuna.aberto = true;
    },
    addLinha() {
      console.log(`Adicionando nova linha`);
      console.log(this.telasConfiguradas);

      this.telasConfiguradas.push([
        { nome: `${this.getProximoNomeDisponivel()}` },
      ]);
      this.$store.dispatch("mostrarNotificacao", {
        msg: "Linha de slots adicionado",
        tipo: "ok",
        tempo: 5,
      });
      this.salvarEdicao();
    },
    excluirLinha(linha_index) {
      this.telasConfiguradas = this.telasConfiguradas.filter(
        (linhaArray, index_linha) => index_linha != linha_index
      );
      this.$store.dispatch("mostrarNotificacao", {
        msg: "Linha de slots excluido",
        tipo: "ok",
        tempo: 5,
      });
      this.salvarEdicao();
    },
    addColuna(index_linha) {
      console.log(`Adicionando uma nova coluna na linha ${index_linha}`);
      let colunas = this.telasConfiguradas[index_linha];

      colunas.push({ nome: `${this.getProximoNomeDisponivel()}` });
      this.$store.dispatch("mostrarNotificacao", {
        msg: "Novo slot adicionado",
        tipo: "ok",
        tempo: 5,
      });
      this.salvarEdicao();
    },
    removeColuna(index_linha, index_coluna) {
      console.log(`Excluindo coluna ${index_linha}->${index_coluna}`);
      this.$store.dispatch("mostrarNotificacao", {
        msg: "Slot excluido",
        tipo: "ok",
        tempo: 5,
      });

      this.telasConfiguradas[index_linha] = this.telasConfiguradas[
        index_linha
      ].filter((telaObjeto, coluna_index) => coluna_index != index_coluna);

      if (this.telasConfiguradas[index_linha].length == 0) {
        this.telasConfiguradas = this.telasConfiguradas.filter(
          (linhaObj, linha_index) => linha_index != index_linha
        );
      }
      this.salvarEdicao();
    },
    salvarEdicao() {
      let telasConfigs = [];

      for (let janela of this.telasConfiguradas) {
        telasConfigs.push(toRaw(janela));
      }
      this.$emit("salvar", telasConfigs);
    },
    eventoCancelaEdicao() {
      console.log(`Edição cancelada...`);
      this.janelasFlutuantes.editandoColuna.aberto = false;
    },
    /**
     * @param {{
        tipo: "",
        nomeJanela: "",
        propriedades: {},
      }} dadosEditados
     */
    eventoEditouColuna(dadosEditados) {
      console.log(`Novos dados editados!`);
      console.log(dadosEditados);

      try {
        let linha = this.janelasFlutuantes.editandoColuna.linha;
        let coluna = this.janelasFlutuantes.editandoColuna.coluna;

        let objetoColuna = this.telasConfiguradas[linha][coluna];

        objetoColuna.nome = dadosEditados.nomeJanela;
        objetoColuna.tipo = dadosEditados.tipo;
        objetoColuna.propriedades = dadosEditados.propriedades;
        this.janelasFlutuantes.editandoColuna.aberto = false;
        this.salvarEdicao();
        this.$store.dispatch("mostrarNotificacao", {
          msg: "Slot alterado com sucesso",
          tipo: "ok",
          tempo: 5,
        });
      } catch (ex) {
        console.log(ex);
        console.log(`Erro ao realizar salvamento da edição`);
      }
    },
    /**
     * Encontra o proximo nome disponivel quando o usuario adicionar um novo slot
     */
    getProximoNomeDisponivel() {
      let slotsConfigurados = this.propAbasCarregadas;

      let nomeAtual = "NOVO SLOT %numero_atual%";
      let contadorAtual = 1;
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
          const slotConfigurado =
            slotsConfigurados[linhaSlotIndex][slotConfiguradoIndex];

          console.log(
            `Verificando se ${slotConfigurado.nome} == ${nomeAtual.replaceAll(
              "%numero_atual%",
              contadorAtual
            )}`
          );
          if (
            slotConfigurado.nome ==
            nomeAtual.replaceAll("%numero_atual%", contadorAtual)
          ) {
            contadorAtual++;
          }
        }
      }

      nomeAtual = nomeAtual.replaceAll("%numero_atual%", contadorAtual);
      return nomeAtual;
    },
  },
};
</script>

<style scoped src="./css/ConfiguraAbas.css">

</style>