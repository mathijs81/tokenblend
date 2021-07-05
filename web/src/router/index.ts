import { createRouter, createWebHashHistory, createWebHistory, RouteRecordRaw } from 'vue-router';
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
  // Disabled web history because we run on github pages.
  //createWebHistory(process.env.BASE_URL),
  history: createWebHashHistory(),
  routes,
});

export default router;
