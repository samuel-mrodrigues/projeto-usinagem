console.log(`----[ MODIFICAÇÃO DA FICHA TECNICA ]-------`);

// Nome da aba sendo mostrada nessa janela
let aba_principal = ""
let nome_decorativo_aba = ""

// Define qual aba será mostrada na janela que esse script for inserido
ipcRenderer.on("DEFINIR-ABA-JANELA", async (evento, aba_id) => {
    aba_principal = aba_id
    removerAbas()
})

// Define qual aba será mostrada na janela que esse script for inserido
ipcRenderer.on("DEFINIR-NOME-JANELA", async (evento, nome) => {
    nome_decorativo_aba = nome
})

// Confirmação de OK vinda do main process, notificando que a pagina pode iniciar suas alterações
ipcRenderer.on("OK", async (ev) => {
    inicio()
    await pausa(1)
    toggleConteudo(true)
})

// Aplica uma opacidade de 0% ou 100%
ipcRenderer.on("ESCONDER-PAGINA", async (evento, esconder = true) => {
    toggleConteudo(!esconder)
})

ipcRenderer.on("ESTA-MOSTRANDO-PDF", async (ev) => {
    ev.re
})

// Altera opacidade da pagina inteira
function toggleConteudo(bool) {
    for (const elemento of document.getElementsByTagName("body")) {
        elemento.style.opacity = bool ? '100%' : '0%'
        elemento.style.overflow = bool ? '' : 'hidden'
    }
}

// Remove as abas que não são as selecionadas
function removerAbas() {
    // Se a aba não estiver definida
    if (aba_principal == -1 || aba_principal == "") {
        console.log(`Não irei mostrar nada pois não encontrei a aba ${aba_principal}`);
        return;
    }

    console.log(`Removendo outras abas`);
    // Exclui todas as outras abas do menu de escolha
    let elementos_remover = []
    let abas_elemento = document.getElementById("produto_tab")
    for (let elemento_aba of abas_elemento.children) {
        let aba_href = elemento_aba.getElementsByTagName("a")[0].getAttribute("href")
        let aba_fichaid = aba_href.split("-")[3]

        // Deixo somente a ficha visivel da aba principal definida
        if (aba_fichaid == aba_principal) {
            elemento_aba.classList.add('active')
        } else {
            elementos_remover.push(elemento_aba)
        }
    }

    console.log(`Removenod outros paineis..`);
    let encontrouAbaPrincipal = false;
    // Excluo também as paginas ocultas das outras abas, da aba 0 ate a 50, mesmo que não exista
    for (let index = 0; index < 50; index++) {
        let possivelElemento = document.getElementById(`ficha-tecnica-aba-${index}`)

        if (possivelElemento == undefined) continue

        if (index == aba_principal) {
            // Aproveita também que achei o tab que quero mostrar, e seto como ativo
            possivelElemento.classList.add('active')
            encontrouAbaPrincipal = true
            continue
        }

        elementos_remover.push(possivelElemento)
    }

    elementos_remover.forEach(elemento => elemento.style.display = 'none')

    // Se não achou a aba principal, mostrar um aviso
    if (!encontrouAbaPrincipal) {

        let elementoErro = document.createElement("p")
        elementoErro.setAttribute("style", "font-weight: bold;color: red;text-align: center;font-size: 3rem")
        elementoErro.innerText = "Nada para visualizar aqui..."

        let elementoPainel = document.querySelector(".tab-content")
        elementoPainel.appendChild(elementoErro)
    }
}

async function pausa(tempo = 1) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, tempo * 1000)
    })
}

async function inicio() {
    // Remove a aba de navegação que aparece no site
    document.getElementById("page-container").getElementsByTagName("nav")[0].remove()

    document.onkeydown = (evento) => {
        let keyPressionada = evento.key.toLowerCase()
        switch (keyPressionada) {
            default:
                break;
        }
    }
    // Registra um listerner que, quando o usuario clique em um link que é um PDF;
    // Irá abrir o visualizador de PDF do mesmo
    document.onclick = (ev) => {
        if (ev.target.nodeName == "A" && ev.target.getAttribute('href') != undefined && ev.target.getAttribute('href').indexOf(".pdf") != -1) {

            // Pega o link do PDF clicado
            let pdf_link = ev.target.getAttribute("href")

            // Impede a ação padrão que no caso     eria abrir o PDF em uma aba
            ev.preventDefault()

            // Chama a função para iniciar a visualização do PDF
            abrirPDF(pdf_link)
        }
    }

    // Tira o formulario acima do nome do produto e insere o nome da aba aberta atual
    let elementoFormulario = document.querySelector("#page-container > div > div:nth-child(9)")
    elementoFormulario.outerHTML = `
    <div>
      <p style="font-size: 2rem;text-align: center;color: black; font-weight: bold">${nome_decorativo_aba}
     </p>
    </div>
    `

    // Remove o header do "Visualizar"
    let elementoHeader = document.querySelector("#page-container > div > h1")
    if (elementoHeader != undefined) elementoHeader.remove()
}

// Mantenho um estado de qual PDF está sendo visualizado, junto com outras informações uteis
var visualizador_opcoes = {
    // Zoom atual do PDF, o qual o usuario pode aumentar ou diminuir
    // Por padrão o zoom é 1, que é o tamanho proporcional ao display da tela
    // O zoom é aumentado em diminuido a cada 0.25
    zoom_atual: 1,
    // Informações do ultimo PDF aberto(que no caso seria o atual)
    pdf_ultimo_aberto: {
        caminho: "",
        objeto_pagina: null
    },
    // Se o visualizador de PDF esta visivel
    mostrando: false,
    // A ultima posição do scroll antes do usuario abrir o PDF, para que ao fechar a visualização
    // Retomar da onde ele estava
    posicao_top: 0
}

/**
 ** Renderiza uma pagina de PDF em um elemento Canvas
 * @param {HTMLElement} convas_elemento Elemento Canvas 
 * @param {*} pagina_pdf Objeto pagina vindo do pdf.js
 */
async function renderizarPdf(convas_elemento, pagina_pdf) {

    // Instancia do contexto do canvas onde o desenho é colocado
    let elementoCanvasContexto = convas_elemento.getContext("2d")
    let viewportFinal;
    if (visualizador_opcoes.zoom_atual <= 1) {
        console.log(`Renderizando PDF por completo...`);

        let viewportOriginal = pagina_pdf.getViewport({ scale: 1 });

        let tamanhoTelaWidth = viewportOriginal.width
        let tamanhoTelaHeigth = window.innerHeight

        // Setar a altura do visualizador do canvas
        convas_elemento.width = tamanhoTelaWidth;
        convas_elemento.height = tamanhoTelaHeigth;

        // Configurar o tamanho do PDF
        var scale = Math.min((convas_elemento.height / viewportOriginal.height), (convas_elemento.width / viewportOriginal.width));

        viewportFinal = pagina_pdf.getViewport({ scale: scale })
        convas_elemento.width = viewportFinal.width
        convas_elemento.height = viewportFinal.height
    } else {
        console.log(`Renderizando PDF com zoom...`);
        let tamanhoTelaWidth = window.innerWidth - (0.10 * window.innerWidth)
        let tamanhoTelaHeigth = window.innerHeight - (0.10 * window.innerHeight)

        console.log(`Tamanho width: ${tamanhoTelaWidth}`);
        console.log(`Tamanho heigth: ${tamanhoTelaHeigth}`);

        // Configurar o tamanho do PDF
        let viewportOriginal = pagina_pdf.getViewport({ scale: 1 });
        viewportFinal = pagina_pdf.getViewport({ scale: viewportOriginal.scale * visualizador_opcoes.zoom_atual })
        console.log(viewportFinal);

        convas_elemento.width = viewportFinal.width;
        convas_elemento.height = viewportFinal.height;
    }
    // Passa o contexto do canvas para a pagina PDF, para que ele desenhe o PDF
    pagina_pdf.render({ canvasContext: elementoCanvasContexto, viewport: viewportFinal })
}

/**
 ** Abrir o visualizador de algum PDF
 * @param {String} link_pdf URL do pdf para abrir
 */
async function abrirPDF(link_pdf) {
    // Carrega o PDF chamando a função da lib do pdf.js
    let pdfCarregado;
    try {
        pdfCarregado = await pdfjsLib.getDocument(link_pdf).promise
    } catch (ex) {

        // Envia uma msg de erro via electron
        enviarDialogo({
            type: "error",
            title: "Visualizador PDF",
            message: "O desenho não foi encontrado no servidor!",
            buttons: ["Fechar"]
        })
        return;
    }

    // Pega a primeira pagina(que na teoria só vai ter essa)
    let paginaConteudo = await pdfCarregado.getPage(1)

    // Cria o elemento visualizador que dentro conterá o canvas do PDF desenhado
    let elementoVisualizador = criarElementoVisualizar()

    // Pega o elemento canvas que estara dentro desse elemento visualizador
    let elementoCanvas = elementoVisualizador.getElementsByTagName("canvas")[0]

    // Renderiza a pagina do PDF no elemento do canvas
    renderizarPdf(elementoCanvas, paginaConteudo)

    // Insere o visualizador no body da pagina
    document.getElementsByTagName("body")[0].appendChild(elementoVisualizador)

    // Atribui abaixo alguns listeners para controlar o visualizador

    // Caso o usuario clique em fechar PDF
    document.getElementById("fechar_visualizar_pdf").onclick = (ev) => {

        // Exclui o visualizador da pagina
        document.getElementById("visualizador_pdf").remove()

        // Reseta as variaveis que guardam o ultimo PDF visto
        visualizador_opcoes.mostrando = false
        visualizador_opcoes.pdf_ultimo_aberto.caminho = ""
        visualizador_opcoes.pdf_ultimo_aberto.objeto_pagina = null
        document.onscroll = null

        // Mostra os elementos da pagina novamente, que por padrão, são todos ocultos para que somente
        // A janela do PDF fique sendo mostrada
        mostrarElementos()

        // Volta o scroll da pagina para a posição original antes do usuario ter visualizado o PDF
        window.scrollTo(0, visualizador_opcoes.posicao_top)
    }

    // Listeners do botão de zoom
    document.getElementById("visualizador_maiszoom").onclick = () => {
        alterarZoom("+");
    }

    document.getElementById("visualizador_menoszoom").onclick = () => {
        alterarZoom("-");

    }

    // Um pequeno listener para que os controles do visualizador não saiam da tela caso o usuario
    // Arraste a barra de rolagem horizontal
    document.onscroll = () => {
        document.getElementById("controles_visualizador").style.marginLeft = `${window.scrollX}px`
    }

    // Guarda as informações do PDF sendo visto atualmente
    visualizador_opcoes.posicao_top = window.scrollY
    visualizador_opcoes.mostrando = true
    visualizador_opcoes.pdf_ultimo_aberto.caminho = link_pdf
    visualizador_opcoes.pdf_ultimo_aberto.objeto_pagina = paginaConteudo

    // Esconde todos os elementos da pagina, menos o visualizador
    esconderTodosElementos()
}

/**
 ** Altera o zoom do visualizador de PDF atual
 * @param {('+' | '-')} tipo_zoom
 */
function alterarZoom(tipo_zoom = "+") {
    switch (tipo_zoom.toLowerCase()) {
        case "+":
            if ((visualizador_opcoes.zoom_atual + 0.25) >= 5) return
            visualizador_opcoes.zoom_atual += 0.25
            break;
        case "-":
            if ((visualizador_opcoes.zoom_atual - 0.25) < 1) return

            visualizador_opcoes.zoom_atual -= 0.25
            break;
        default:
            visualizador_opcoes.zoom_atual += 0.25
            break;
    }

    // Pega o elemento visualizador e o canvas
    let elementoVisualizador = document.getElementById("visualizador_pdf")
    let elementoCanvas = elementoVisualizador.getElementsByTagName("canvas")[0]

    // Pega a pagina sendo mostrada
    let paginaPdf = visualizador_opcoes.pdf_ultimo_aberto.objeto_pagina

    console.log(`Nivel de zoom atual: ${visualizador_opcoes.zoom_atual}`);
    // Renderiza o PDF no canvas novamente  
    renderizarPdf(elementoCanvas, paginaPdf)
}

/**
 * Cria e retorna um elemento HTML visualizador de PDF, contendo os controles e o Canvas
 * @returns {HTMLElement} Elemento visualizador
 */
function criarElementoVisualizar() {
    // Cria uma div edefine os atributos
    let elemento = document.createElement("div")
    elemento.setAttribute("id", "visualizador_pdf")
    elemento.style.left = '0px'

    // Cria um canvas e o controlador do visualizador
    elemento.innerHTML = `
    <div id="nome_aba_visualizador">
        <p>${nome_decorativo_aba}</p>
    </div>

    <div id="controles_visualizador">
        <button id="visualizador_maiszoom">+ZOOM</button>
        <button id="visualizador_menoszoom">-ZOOM</button>
        <button id="fechar_visualizar_pdf">FECHAR</button>
    </div>

    <div id="canvas_container">
        <canvas id="canvas_pdf"></canvas>
    </div>
    `
    return elemento;
}

/**
 * Desabilita o scroll da pagina
 */
function disableScroll() {

    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    let scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    window.onscroll = function () {
        window.scrollTo(scrollLeft, scrollTop);
    };
}

/**
 * Habilita o scroll da pagina
 */
function enableScroll() {
    window.onscroll = function () { };
}

/**
 * Esconde todos os elementos(menos o visualizador de PDF)
 */
function esconderTodosElementos() {
    let elementos = document.getElementsByTagName("body")[0]
    for (const elemento of elementos.children) {
        if (elemento.getAttribute("id") != "visualizador_pdf") {
            elemento.display_anterior = elemento.style.display
            elemento.style.display = 'none'
        }
    }
}

/**
 * Mostra todos os elementos novamente
 */
function mostrarElementos() {
    let elementos = document.getElementsByTagName("body")[0]
    for (const elemento of elementos.children) {
        if (elemento.getAttribute("id") != "visualizador_pdf") {
            elemento.style.display = elemento.display_anterior
        }
    }
}

/**
 * Ativa ou desativa a interação da janela principal(que é o menu minimizado também)
 * @param {Boolean} bool 
 */
function toggleInteratividadeJanelaPrincipal(bool) {
    ipcRenderer.invoke("TOGGLE-INTERATIVIDADE-JANELAPRINCIPAL", bool)
}

/**
 * Ativa ou desativa a visibilidade da janela
 * @param {Boolean} bool 
 */
function toggleEscondeJanelaPrincipal(bool) {
    ipcRenderer.invoke("TOGGLE-ESCONDER-JANELAPRINCIPAL", bool)
}