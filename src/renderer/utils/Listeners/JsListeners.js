
// Esse arquivo é para gerenciar os listener padrões do javascript na pagina, para poder utilizar varios eventos sem usar o document.on.. diretamente

/**
 * Lista de listeners cadastrados para terem suas funções executadas
 * @type {[{id: Number, listener: String, funcao: Function}]}
 */
let listenersCadastrados = []

/**
 * Contador unico para identificar os listeners
 */
let contadorUnico = 0;

/**
 * Listeners já cadastrados no document.on..
 */
let documentListenersCadastrados = []

/**
 * Cadastra um listener para ser executado
 * @param {String} listener Listener para escutar, ex: document.onclick
 * @param {Function} funcao Função para executar
 * @return {Number} ID do listener cadastrado
 */
export function cadastrarListener(listener, funcao) {
    let novoId = contadorUnico

    let novoListener = {
        id: novoId,
        funcao: funcao,
        listener: listener
    }
    listenersCadastrados.push(novoListener)

    contadorUnico++
    if (documentListenersCadastrados.indexOf(listener) == -1) {
        registrarListenersJS(listener)
    }

    return novoListener.id
}

/**
 * Exclui um listener cadastrado
 * @param {Number} id ID do listener
 */
export function excluirListener(id) {
    listenersCadastrados = listenersCadastrados.filter(listenerObjeto => listenerObjeto.id != id)
}

/**
 * Se o listener sendo cadastrado ainda não existir, ele será criado aqui abaixo
 * @param {String} listener 
 */
function registrarListenersJS(listener) {
    console.log(`Registrando evento não existente: ${listener}`);
    documentListenersCadastrados.push(listener)

    document[listener] = (eventoData) => {
        let listenersParaChamar = listenersCadastrados.filter(listenerObjeto => listenerObjeto.listener == listener)

        for (const listenerObjeto of listenersParaChamar) {
            console.log(`Executando listener: ${listenerObjeto.id} ${listenerObjeto.listener}`);
            listenerObjeto.funcao(eventoData)
        }
    }
}

