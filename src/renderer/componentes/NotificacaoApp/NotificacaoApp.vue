<template>
  <Transition name="teste">
    <div v-if="notificacao.mostrar" :class="`notificacao ${notificacao.tipoMsg} ${propTamanhoFonte}`">
      <p>{{ notificacao.msg }}</p>
    </div>
  </Transition>
</template>

<script>
export default {
  props: {
    propTamanhoFonte: {
      type: String,
      default: () => 'grande'
    }
  },
  data() {
    return {
      notificacao: {
        msg: "Teste haha",
        mostrar: false,
        taskid: -1,
        tipoMsg: "normal",
      },
      timeoutEspera: -1
    };
  },
  watch: {
    '$store.state.notificacao': {
      handler(nova_msg) {
        this.mostraNotificacao(nova_msg.msg, nova_msg.tempoMostrar, nova_msg.tipoMsg)
      },
      deep: true
    }
  },
  methods: {
    /**
     * Mostra uma notificação na tela
     * @param {String} msg Mensagem a ser mostrada
     * @param {Number} tempo Tempo em segundos para a mensagem ficar na tela, se não mencionado ou for igual a 0, ficara para sempre mostrando
     * @param {('ok'|'erro'|'aviso'|'normal')} tipo_msg O tipo da mensagem define o estilo, ok sera verde, erro vermelho, aviso amarelo e normal branco
     */
    async mostraNotificacao(msg, tempo, tipo_msg = "normal") {
      if (this.notificacao.mostrar) {

        this.notificacao.mostrar = false;
      }

      if (this.notificacao.taskid != -1) {
        clearTimeout(this.notificacao.taskid);
        this.notificacao.taskid = -1;
      }

      this.notificacao.msg = msg;
      this.notificacao.tipoMsg = tipo_msg;
      this.notificacao.mostrar = true;

      if (tempo != undefined && tempo != 0) {
        this.notificacao.taskid = setTimeout(() => {
          this.notificacao.mostrar = false;
          this.notificacao.taskid = -1;
        }, tempo * 1000);
      }
    },
  },
};
</script>

<style scoped src="./css/NotificacaoApp.css">

</style>