import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Example: Vue Router
import store from './store';   // Example: Vuex or Pinia

const app = createApp(App);

app.use(router);
app.use(store);

app.mount('#app');