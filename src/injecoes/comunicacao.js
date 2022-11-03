// Esse arquivo de script irá injetar utilidades na pagina, para poder ter uma clara comunicaçaõ entre a janela e o main process
console.log(`-----[ INJEÇÃO COMUNICAÇÃO ]-------`);

const { ipcRenderer } = window.require("electron/renderer")

ipcRenderer.on("PING", (ev) => {
    console.log(`PING!`);
    ipcRenderer.send("PONG")
})

ipcRenderer.on("SOLICITAR-HTML", (ev) => {
    let htmlString = new XMLSerializer().serializeToString(document)

    ipcRenderer.send("SOLICITAR-HTML-RESPOSTA", { dados: htmlString })
})

/**
 * Envia uma mensagem de dialogo para o usuario na tela
 * @param {Electron.MessageBoxOptions} msgProps 
 */
function enviarDialogo(msgProps) {
    ipcRenderer.invoke("MOSTRAR-DIALOGO", msgProps)
}