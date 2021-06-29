<template>
  <div v-if="state.connected">
    <h2>{{ state.address }}</h2>
    <div class="row">
      <div class="col">TODO TODO</div>
    </div>
  </div>
  <div v-else>Loading...</div>
</template>

<script lang="ts">
import { web3Service } from '@/web3/web3Service';
import { defineComponent, watchEffect } from 'vue';

export default defineComponent({
  setup(props) {
    watchEffect(() => {
      const account = web3Service.status().address;
    });
    const state = web3Service.status();
    return { state };
  },
  components: {},
});
</script>
