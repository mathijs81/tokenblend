import '@/styles/style.scss';

import { createApp } from 'vue';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import router from './router';

import Slider from 'primevue/slider';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Menubar from 'primevue/menubar';

import { web3Service } from './web3/web3Service';
web3Service.init();

const app = createApp(App);
app.use(PrimeVue).use(router);
app.component('Slider', Slider);
app.component('InputText', InputText);
app.component('Dialog', Dialog);
app.component('Menubar', Menubar);

app.mount('#app');
