import { createApp } from 'vue'
import App from './renderer/App.vue'
import store from './renderer/store'

createApp(App).use(store).mount('#app')
