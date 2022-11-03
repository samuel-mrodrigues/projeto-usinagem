<template>
  <div class="configurar-tela">
    <p class="titulo">Configurar Tela</p>

    <div>


      <div class="opcao-menu selecionar-usuario">
        <p class="subtitulo">Parametros</p>

        <div class="campo">
          <span class="questao">
            <div>
              <p>Recurso</p>
              <span class="icone-duvida"
                title="O recurso é a linha de produção. Isso também afeta as OPs que irão aparecer na tela.">?</span>
            </div>
          </span>

          <span class="opcao">
            <select v-model="configuracoesSalvas.usuarioIdExon">
              <option :value="-1" selected>Selecione um recurso</option>
              <option v-for="(usuario, key_usuario) in usuariosDisponiveis" v-bind:key="key_usuario"
                :value="usuario.ID">
                {{ usuario.NOME }}
              </option>
            </select>
          </span>
        </div>

        <div class="campo">
          <span class="questao">
            <div>
              <p>Ativar efeitos</p>
              <span class="icone-duvida" title="Ativa ou desativa efeitos de abertura e fechamento dos slots">?</span>
            </div>
          </span>
          <span class="opcao">
            <select v-model="configuracoesSalvas.outros.ativarEfeitos">
              <option :value="true">Sim</option>
              <option :value="false">Nao</option>
            </select>
          </span>
        </div>
      </div>

      <ConfigurarAbas class="opcao-menu" v-if="config.carregado" v-on:salvar="eventoAlterouAbas"
        :propAbasCarregadas="configuracoesSalvas.abasConfiguradas" />
    </div>

    <div class="acoes">
      <button class="botao botao-cancelar" @click="fecharJanela()">
        Fechar
      </button>
    </div>
  </div>
</template>

<script>
import axios from "axios"
import ConfigurarAbas from "../ConfiguraAbas/ConfiguraAbas.vue";
import path from "path";

export default {
  props: {},
  components: { ConfigurarAbas },
  data() {
    return {
      opcoesDisponiveis: {
        usuarios: [],
        fichaTecnicaAbas: [],
      },
      configuracoesSalvas: {
        usuarioIdExon: -1,
        abasConfiguradas: [[{ nome: "Vazio", tipo: "" }]],
        outros: {
          ativarEfeitos: false
        }
      },
      config: {
        diretorioConfig: `${path.resolve("./")}/configuracao`,
        nomeArquivo: "config.json",
        carregado: false,
      },
    };
  },
  beforeMount() {
    this.carregarArquivoConfig();
    this.getUsersLinhas();
  },
  computed: {
    usuariosDisponiveis() {
      return this.opcoesDisponiveis.usuarios;
    },
  },
  watch: {
    "configuracoesSalvas.usuarioIdExon"() {
      this.notificaSalvarConfiguracao();
    },
    "configuracoesSalvas.outros": {
      handler() {
        this.notificaSalvarConfiguracao();
      },
      deep: true
    },
  },
  methods: {
    fecharJanela() {
      this.$emit("fechar");
    },
    notificaSalvarConfiguracao() {
      this.$store.dispatch("setarConfig", { ...this.configuracoesSalvas });
    },
    carregarArquivoConfig() {
      console.log(`Carregando arquivo de configuração salvos...`);

      // Object.assign({ ...this.$store.state.configuracao }, this.configuracoesSalvas)
      this.configuracoesSalvas = { ...this.$store.state.configuracao }
      this.config.carregado = true;
    },
    async getUsersLinhas() {
      console.log(`Recuperando lista de usuarios de linhas...`);

      let requestUsuarios = await axios.get(`${this.$store.state.backend_api.url}/usuarios`)
      if (requestUsuarios.status != 200) {
        console.log(requestUsuarios.statusText);
        console.log(`Erro ao listar usuarios de linhas do Exon...`);
        return;
      }
      this.opcoesDisponiveis.usuarios = requestUsuarios.data.dados.usuarios;

    },
    async getAbasFichaTecnica() {
      console.log(`Recuperando lista de abas da ficha tecnica...`);
      let requestAbasUsuario = await axios.get(`${this.$store.state.backend_api.url}/usuarios/${this.configuracoesSalvas.usuarioIdExon}/abas`)
      if (requestAbasUsuario.status != 200) {
        console.log(requestAbasUsuario.statusText);
        console.log(`Erro ao recuperar abas do Exon`);
        return;
      }

      this.opcoesDisponiveis.fichaTecnicaAbas = requestAbasUsuario.data.dados.abas;
    },
    eventoAlterouAbas(abaDado) {
      console.log(`Abas foram alteradas! Dados:`);
      console.log(abaDado);

      this.configuracoesSalvas.abasConfiguradas = abaDado
      this.notificaSalvarConfiguracao();
    },
  },
};
</script>

<style scoped src="./css/MenuConfigurar.css">

</style>