console.log(`----[ MODIFICAÇÃO DA FICHA TECNICA ]-------`);

// Nome da aba sendo mostrada nessa janela
let aba_principal = ""
let nome_decorativo_aba = ""

// Informações do produto aberto
let produtoDados = {
    codigo: '',
    marca: {
        id: -1,
        descricao: ''
    }
}

// Define as informações do produto atual aberto
ipcRenderer.on("DEFINIR-PRODUTO", async (evento, dadosProduto) => {
    produtoDados.codigo = dadosProduto.codigo
    produtoDados.marca = dadosProduto.marca
})

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

})

ipcRenderer.on("ABRIR-DESENHO-AUTOMATICO", async (ev) => {
    abrirDesenhoAutomatico()
})

ipcRenderer.on("DESENHO-LINK", async (ev) => {
    ipcRenderer.send("DESENHO-LINK-RESPOSTA", visualizador_opcoes.pdf_ultimo_aberto.caminho);
})

// Altera opacidade da pagina inteira
function toggleConteudo(bool) {
    for (const elemento of document.getElementsByTagName("body")) {
        elemento.style.opacity = bool ? '100%' : '0%'
        elemento.style.overflow = bool ? '' : 'hidden'
    }
}
// Automaticamente encontra um link com desenho na pagina e tenta abri-lo!
async function abrirDesenhoAutomatico() {
    console.log(`Tentando abrir o desenho automaticamente...`);

    // Pega a div que contem as informações do produto atual
    let divDados = document.querySelector(`#ficha-tecnica-aba-${aba_principal}`)

    if (divDados == undefined) {
        console.log(`Ignorando abertura automatica de desenho pois n foi encotnrado a aba principal`);
        ipcRenderer.send("STATUS-DESENHOAUTOMATICO", false);
        return;
    }

    // Possiveis links de PDFs encontrados para abrir
    let linksEncontrados = []

    // Verifico se a ficha atual tem o seletor de marca, pois preciso tratar diferente como busco os links

    // Se existir, procuro no campo da marca atualmente selecionada
    if (existeSeletorDeMarca()) {

        // Pega todos os elemnentos com links no html
        divDados.querySelectorAll(".campos-ficha_tecnica").forEach(campoFicha => {

            // Somente verifica se o campo não estiver oculto
            if (campoFicha.getAttribute("data-marca-id") == produtoDados.marca.id && campoFicha.style.display != 'none') {
                // Se não estiver oculto, procura algum elemento de link dentro dele

                // Passa por todos os elementos a e verifica se é um .pdf
                campoFicha.querySelectorAll('a').forEach(elementoLink => {
                    if (elementoLink.href.toLowerCase().indexOf(".pdf") != -1) {
                        linksEncontrados.push(elementoLink.href)
                    }
                })
            }
        })
    } else {
        let elementosLinks = divDados.querySelectorAll('a')

        // Passa por todos os elementos de links e encontra o primeiro que tiver um .pdf no fim
        for (let elementoLink of elementosLinks) {
            if (elementoLink.href.toLowerCase().indexOf(".pdf") != -1) {
                linksEncontrados.push(elementoLink.href)
            }
        }
    }


    // Se achou algum link, tenta abrir o PDF dele..
    if (linksEncontrados.length != 0) {
        console.log(`Total de links encontrados: ${linksEncontrados.length}, usando o 1.o encontrado`);

        let desejoEscolhido = linksEncontrados[0]
        console.log(`Link de desenho encontrado: ${desejoEscolhido}`);

        // O status contem true se o pdf foi encontrado e aberto, caso contrario será false
        let statusAbrir = await abrirPDF(desejoEscolhido, false)
        ipcRenderer.send("STATUS-DESENHOAUTOMATICO", statusAbrir);

    } else {
        console.log(`Nenhum link de desenho encontrado...`);

        if (existeSeletorDeMarca()) {
            if (produtoDados.marca.id == -1) {
                console.log(`Permitindo a visiblidade da aba pois pois seletor de marcas...`);
                ipcRenderer.send("STATUS-DESENHOAUTOMATICO", true);
                return;
            }
        }

        ipcRenderer.send("STATUS-DESENHOAUTOMATICO", false);
    }
}

// Se a aba tiver um campo para selecionar a marca, automaticamente irá definir a marca pela que esta setado na variavel das informações do produto
function selecionarMarcaAutomatico() {
    if (produtoDados.marca.id == -1) {
        console.log(`Produto sem marca, ignorando seleção automatica...`);
        return;
    }

    let seletorMarca = document.querySelector("select.select-marcas-ficha-tecnica")

    if (seletorMarca != undefined) {
        console.log(`Selecionando marca padrão ${produtoDados.marca.descricao} no seletor de marca...`);

        seletorMarca.value = produtoDados.marca.id

        seletorMarca.dispatchEvent(new Event('change'))
    } else {
        console.log(`Sem campo de seleção de marca, ignorando...`);
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

    elementos_remover.forEach(elemento => elemento.remove())

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

    // Faz umas modificações no seletor de marca desse cara
    seletorMarca()

    // Seleciona a marca automaticamente
    selecionarMarcaAutomatico()
}

/**
 * Algumas modificações na seleção de marcas
 */
function seletorMarca() {
    /**
     * @type {HTMLElement}
     */
    let seletorMarca = document.querySelector("select.select-marcas-ficha-tecnica")
    if (seletorMarca != undefined) {
        console.log(`Aplicando modificações do seletor de marca...`);

        seletorMarca.onfocus = () => {
            ipcRenderer.invoke("TOGGLE-PERMITIR-FOCO", false)
        }

        seletorMarca.onblur = () => {
            ipcRenderer.invoke("TOGGLE-PERMITIR-FOCO", true)
        }
    }
}

/**
 * Retorna true ou false se existe o seletor de marcas nessa ficha atual
 */
function existeSeletorDeMarca() {
    return document.querySelector("select.select-marcas-ficha-tecnica") != undefined
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
 * @returns {Promise<Boolean>} True/false se conseguiu abrir o PDF
 */
async function abrirPDF(link_pdf, mostrarAlertaErro = true) {
    // Carrega o PDF chamando a função da lib do pdf.js
    let pdfCarregado;
    try {
        pdfCarregado = await pdfjsLib.getDocument(link_pdf).promise
    } catch (ex) {

        if (mostrarAlertaErro) {
            console.log(`Enviando alerta de erro..`);
            // Envia uma msg de erro via electron
            enviarDialogo({
                type: "error",
                title: "Visualizador PDF",
                message: "O desenho não foi encontrado no servidor!",
                buttons: ["Fechar"]
            })
        } else {
            console.log(`Erro ao abrir PDF, provavelmente o link do PDF não existe...`);
        }
        return false;
    }

    // Pega a primeira pagina(que na teoria só vai ter essa)
    let paginaConteudo = await pdfCarregado.getPage(1)

    // Cria o elemento visualizador que dentro conterá o canvas do PDF desenhado
    let elementoVisualizador = criarElementoVisualizar()

    // Pega o elemento canvas que estara dentro desse elemento visualizador
    let elementoCanvas = elementoVisualizador.getElementsByTagName("canvas")[0]

    // Renderiza a pagina do PDF no elemento do canvas
    await renderizarPdf(elementoCanvas, paginaConteudo)

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
        window.scrollTo(0, visualizador_opcoes.posicao_top);

        ipcRenderer.send("PDF-FECHADO");
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

    ipcRenderer.send("PDF-ABERTO");
    return true;
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