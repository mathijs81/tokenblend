<template>
  <div class="container">
    <div class="float-end">
      {{ state.address }}
    </div>
    <div class="text-center">
      <router-link to="/">Home</router-link> | <router-link to="/sliders">Sliders</router-link> |
      <router-link to="/enzyme_sliders">Enzyme sliders</router-link> | <router-link to="/FarmingStrategy">Farming</router-link>
    </div>
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { web3Service } from './web3/web3Service';

export default defineComponent({
  setup() {
    const state = web3Service.status();
    return { state };
  },
});
</script>
