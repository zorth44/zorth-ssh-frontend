import { createApp } from 'vue'
import { createPinia } from 'pinia' // Import Pinia
import App from './App.vue'
import router from './router' // Import the router
import './style.css' // Tailwind CSS styles

const app = createApp(App)

app.use(createPinia()) // Use Pinia
app.use(router) // Use Vue Router

app.mount('#app')
