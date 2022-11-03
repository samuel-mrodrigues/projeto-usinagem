// Arquivo de modificação injetado na pagina que mostra as OPs
ipcRenderer.on("OK", async (evento) => {
    inicio()
    await pausa(1)
    toggleConteudo(true)
})

ipcRenderer.on("ESCONDER-PAGINA", async (evento, esconder = true) => {
    toggleConteudo(!esconder)
})

async function pausa(tempo = 1) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, tempo * 1000)
    })
}


function inicio() {
    // Remove a aba de navegação que aparece no site
    document.querySelector("#header").remove()
    console.log(`Tentando remover o header...`);

    document.onkeydown = (evento) => {
        let keyPressionada = evento.key.toLowerCase()
        switch (keyPressionada) {
            default:
                break;
        }
    }
}

function toggleConteudo(bool) {
    for (const elemento of document.getElementsByTagName("body")) {
        elemento.style.opacity = bool ? '100%' : '0%'
        elemento.style.overflow = bool ? '' : 'hidden'
    }
}
