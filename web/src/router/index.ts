import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Home from '../views/Home.vue';
import EnzymeSliders from '../views/EnzymeSliders.vue';

import FarmingStrategy from '../views/FarmingStrategy.vue';

import Uniswap from '../views/Uniswap.vue';


const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/sliders',
    name: 'Sliders',
    component: () => import(/* webpackChunkName: "sliders" */ '../views/ConstantStrategy.vue'),
  },
  {
    path: '/enzyme_sliders',
    name: 'EnzymeSliders',
    component: EnzymeSliders,
  },
  {

    path: '/FarmingStrategy',
    name: 'FarmingStrategy',
    component: FarmingStrategy,
  },
  {
    path: '/uniswap',
    name: 'Uniswap',
    component: Uniswap,
  },

];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
