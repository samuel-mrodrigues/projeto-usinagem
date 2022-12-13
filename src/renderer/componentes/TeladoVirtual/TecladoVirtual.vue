<style scoped>
.teclado {
    background-color: #2f2d2d;
    border: 1px solid #caca3d;
    border-radius: 5px;
    display: grid;
    grid-template-areas:
        "primeiro"
        "segundo"
        "terceiro"
        "quarto"
        "quinto";
}

.teclado .teclas {
    display: flex;
    justify-content: center;
}

.teclado .teclas.primeiro {
    grid-area: primeiro;
}

.teclado .teclas.segundo {
    grid-area: segundo;
}

.teclado .teclas.terceiro {
    grid-area: terceiro;
}

.teclado .teclas.quarto {
    grid-area: quarto;
}

.teclado .teclas.quinto {
    grid-area: quinto;
}
</style>

<template>
    <div class="teclado">
        <div class="teclas primeiro">
            <TeclaTecladoVue :propTecla="'Q'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'W'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'E'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'R'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'T'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'Y'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'U'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'I'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'O'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'P'" v-on:tecla-pressionada="teclaPressionada" />
        </div>
        <div class="teclas segundo">
            <TeclaTecladoVue :propTecla="'A'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'S'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'D'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'F'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'G'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'H'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'K'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'L'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'Ç'" v-on:tecla-pressionada="teclaPressionada" />
        </div>
        <div class="teclas terceiro">
            <TeclaTecladoVue :propTecla="'Z'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'X'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'C'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'V'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'B'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'N'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'M'" v-on:tecla-pressionada="teclaPressionada" />
        </div>
        <div class="teclas quarto">
            <TeclaTecladoVue :propTecla="'0'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'1'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'2'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'3'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'4'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'5'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'6'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'7'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'8'" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'9'" v-on:tecla-pressionada="teclaPressionada" />
        </div>
        <div class="teclas quinto">
            <TeclaTecladoVue :propTecla="' '" propDecorativo="ESPAÇO" v-on:tecla-pressionada="teclaPressionada" />
            <TeclaTecladoVue :propTecla="'APAGAR'" v-on:tecla-pressionada="teclaPressionada" />

        </div>
    </div>
</template>

<script>
import TeclaTecladoVue from './TeclaTeclado.vue';

export default {
    emits: ["tecla-digitada", "apagar", "tecla"],
    components: {
        TeclaTecladoVue
    },
    data() {
        return {

        }
    },
    mounted() {
    },
    methods: {
        /**
         * Evento chamado quando uma tecla é disparada
         * @param {String} tecla 
         */
        teclaPressionada(tecla) {
            switch (tecla.toLowerCase()) {
                case 'apagar':
                    this.$emit("apagar")
                    break;
                default:
                    this.$emit("tecla-digitada", tecla)
                    break;
            }

            this.$emit("tecla")
        }
    }
}
</script>