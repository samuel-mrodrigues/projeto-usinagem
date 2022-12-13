<template>
    <NotificacaoApp prop-tamanho-fonte="pequena" />
    <div ref="paginador" class="paginador">
        <div class="opcao anterior" @click="clicouPaginador('anterior')" v-if="statusModoAutomatico">
            <p class="tipo">Anterior</p>
            <p class="produto">{{ `${getProduto('anterior').produto}` }}</p>
            <p class="marca">{{ `${getProduto('anterior').marca}` }}</p>
        </div>
        <div class="atual">
            <p class="tipo">Atual</p>
            <p class="produto">{{ getProduto('atual').produto }}</p>
            <p class="marca">{{ `${getProduto('atual').marca}` }}</p>
        </div>
        <div class="opcao proximo" @click="clicouPaginador('proximo')" v-if="statusModoAutomatico">
            <p class="tipo">Proximo</p>
            <p class="produto">{{ `${getProduto('proximo').produto}` }}</p>
            <p class="marca">{{ `${getProduto('proximo').marca}` }}</p>
        </div>
    </div>

    <div class="acoes">
        <button @click="$store.dispatch('toggleModoMinimizado', false)">Menu</button>
        <button @click="$store.dispatch('minimizarPrograma')">Minimizar Programa</button>
    </div>
</template>

<style scoped>
.acoes {
    display: flex;
    justify-content: space-between;
}

.acoes button {
    border: none;
    color: black;
    font-weight: bold;
    padding: 3px;
}

.acoes button:hover {
    color: white;
    background-color: black;
    cursor: pointer;
}

.acoes button:not(:last-child) {
    margin-right: 10px;
}

.paginador {
    display: flex;
    justify-content: space-around;
}

.paginador .opcao {
    font-size: 1.1rem;
    border: 4px solid gold;
    color: white;
}

.paginador .opcao p {
    padding: 0;
    margin: 0;
}

.paginador .opcao .tipo {
    border-bottom: 2px solid gold;
    font-weight: bold;
}

.paginador .opcao:hover {
    background-color: gold;
    color: black;
    cursor: pointer;
}

.paginador .opcao:hover .tipo {
    border-bottom: 2px solid white
}

.paginador .atual {
    font-size: 1.3rem;
}

.paginador .atual p {
    color: gold;
    font-weight: bold;
    margin: 0;
    padding: 0;
}

.paginador .atual .produto {
    font-size: 1.1rem;
    margin-bottom: 4px;
}

.paginador .produto {
    font-size: 1.0rem;
    margin-bottom: 4px;
}
</style>

<script>
import NotificacaoApp from "../NotificacaoApp/NotificacaoApp.vue"

export default {
    name: "ModoMinimizado",
    components: { NotificacaoApp },
    beforeMount() {
        document.querySelector("body").style.overflow = "hidden"
    },
    beforeUnmount() {
        document.querySelector("body").style.overflow = ""

    },
    data() {
        return {

        }
    },
    computed: {
        statusModoAutomatico() {
            return this.$store.state.status.modoAutomatico
        }
    },
    methods: {
        /**
         * @param {('anterior' | 'atual' | 'proximo')} posicao
         */
        getProduto(posicao) {
            let produtoObjeto = {}

            if (this.$store.state.status.modoAutomatico) {
                switch (posicao) {
                    case "anterior":
                        produtoObjeto = this.$store.getters.getProdutoAnterior
                        break;
                    case "atual":
                        produtoObjeto = this.$store.getters.getProdutoAtual
                        break;
                    case "proximo":
                        produtoObjeto = this.$store.getters.getProdutoProximo
                        break;
                    default:
                        break;
                }
            } else {
                produtoObjeto = {
                    produto_codigo: this.$store.state.status.ultimoProdutoDigitado,
                    marca_descricao: ''
                }
            }

            return {
                produto: produtoObjeto.produto_codigo.replace("PIU", ""),
                marca: produtoObjeto.marca_descricao.replace("HIPPER FREIOS", "HF")
            }

        },
        /**
         * Alternar entre os produtos listados nas OPs
         * @param {('proximo' | 'anterior')} opcao 
         */
        clicouPaginador(opcao) {
            switch (opcao.toLowerCase()) {
                case "proximo": {
                    this.$store.dispatch("alterarProdutoAberto", 'avancar')
                    break;
                }
                case "anterior": {
                    this.$store.dispatch("alterarProdutoAberto", 'voltar')
                    break;
                }
            }
        }
    }
}
</script>