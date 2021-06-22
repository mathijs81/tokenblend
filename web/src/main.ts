import '@/styles/style.scss';

import { createApp } from 'vue';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import router from './router';

import Slider from 'primevue/slider';
import InputText from 'primevue/inputtext';

const app = createApp(App);
app.use(PrimeVue).use(router);
app.component('Slider', Slider);
app.component('InputText', InputText);

app.mount('#app');
