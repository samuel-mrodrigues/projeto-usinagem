import { toRaw } from "vue"
import { ipcRenderer } from "electron"

/**
 * Pausa o codigo por x segundos
 * @param {Number} tempo Tempo em segundos (padrão será 1 se não informado)
 */
export async function pausa(tempo = 1) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, tempo * 1000);
    })
}

/**
 * Remove toda a reatividade (Proxy) de qualquer objeto, incluindo proxys dentro de proxys
 * @param {{} | Array} objeto Objeto a remover
 */
export function removerReatividade(objeto) {
    objeto = toRaw(objeto)

    for (const prop in objeto) {
        if (typeof objeto[prop] == "object") {
            objeto[prop] = toRaw(objeto[prop])
            removerReatividade(objeto[prop])
        }
    }

    return objeto
}

/**
 * Retorna o diretorio raiz do programa
 */
export async function getDiretorioPrograma() {
    return await ipcRenderer.invoke("DIRETORIO-ARQUIVO")
}
