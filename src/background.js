import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
const isDevelopment = process.env.NODE_ENV !== 'production'

import { iniciarGerenciadorJanelas, cadastrarHandlersJanelas } from "./main/janela/gerenciador_janelas.js"
import { iniciarAtualizador } from "./main/atualizador/atualizador.js"

import { PropriedadesPrograma, getDiretorioPrograma } from "./utils/Utils.js"

/**
 * Janela principal do programa
 * @type {BrowserWindow}
 */
let janela_principal;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

ipcMain.handle("FECHAR-PROGRAMA", (evento) => {
  console.log(`Solicitado fechamento do programa...`);
  app.quit()
})

ipcMain.handle("DIRETORIO-PROGRAMA", (evento) => {
  return getDiretorioPrograma()
})

// Cadastra os handlers das janelas...
cadastrarHandlersJanelas()

// Opções se estiver no modo dev
if (!PropriedadesPrograma.modoDev) {

  // Iniciar o atualizador
  iniciarAtualizador()
}

async function carregarJanelaPrincipal() {
  console.log(`Carregando janela principal`);

  // Create the browser window.
  janela_principal = new BrowserWindow({
    width: PropriedadesPrograma.JanelaPrincipal.Janela.width,
    height: PropriedadesPrograma.JanelaPrincipal.Janela.heigth,
    webPreferences: {

      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    resizable: false,
    fullscreenable: false
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await janela_principal.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) janela_principal.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    await janela_principal.loadURL('app://./index.html')
  }

  janela_principal.JANELA_MASTER = true
  // janela_principal.webContents.openDevTools()
  // janela_principal.webContents.devToolsWebContents.session.clearStorageData()
  // janela_principal.webContents.devToolsWebContents.session.clearCache()

  // Inicia o gerandor de janelas
  iniciarGerenciadorJanelas()
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) carregarJanelaPrincipal()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  // createWindow()
  await carregarJanelaPrincipal()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
