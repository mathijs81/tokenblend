import '@/styles/style.scss';
import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Menubar from 'primevue/menubar';
import Slider from 'primevue/slider';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { web3Service } from './web3/web3Service';

web3Service.init();
const app = createApp(App);
app.use(PrimeVue).use(router);
app.component('Slider', Slider);
app.component('InputText', InputText);
app.component('Dialog', Dialog);
app.component('Menubar', Menubar);

app.mount('#app');
