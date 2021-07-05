import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Home from '../views/Home.vue';
import EnzymeAccount from '../views/EnzymeAccount.vue';
import WalletAccount from '../views/WalletAccount.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/enzyme/:account',
    name: 'EnzymeAccount',
    component: EnzymeAccount,
    props: true,
  },
  {
    path: '/wallet',
    name: 'WalletAccount',
    component: WalletAccount,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
