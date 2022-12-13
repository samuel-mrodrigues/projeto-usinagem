<template>
    <span @click="clicouTecla()">
        {{ teclaTeclado }}
    </span>
</template>
<script>
export default {
    emits: ["tecla-pressionada"],
    props: {
        propTecla: {
            type: String,
            default: () => ''
        },
        propDecorativo: {
            type: String,
            default: () => ''
        }
    },
    data() {
        return {

        }
    },
    computed: {
        teclaTeclado() {
            if (this.propDecorativo == '') {
                return this.propTecla
            } else {
                return this.propDecorativo
            }
        }
    },
    methods: {
        /**
         * Dispara o evento quando o usuario clica na tecla
         */
        clicouTecla() {
            this.$emit("tecla-pressionada", this.propTecla)
        }
    }
}
</script>
<style scoped>
span {
    padding: 5px;
    margin: 1.5px;
    background-color: #ffd21f;
    color: black;
    font-weight: bold;
    border: 1px solid black;
    border-radius: 3px;
}

span:hover {
    background-color: black;
    color: #ffd21f;
    cursor: pointer;
}
</style>