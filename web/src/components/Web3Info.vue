<template>
  <div>
    <div v-if="status.initializing" class="text-center">Connecting...</div>
    <div v-else-if="!status.connected" class="d-flex flex-column align-items-center">
      <img :src="publicPath + 'mm-logo.svg'" class="p-2" />
      <p class="pt-2 mb-0">You need to connect your Metamask wallet to continue.</p>
      <a class="btn btn-link mb-5" target="_blank" href="https://metamask.io/download.html"
        >Get metamask</a
      >

      <button type="button" class="btn btn-primary mb-2" @click="connect">Connect now</button>
      <p v-if="status.lastErrorMessage" class="mb-2 alert alert-warning">
        {{ status.lastErrorMessage }}
      </p>
    </div>
    <span v-else> Connected to {{ status.account }} </span>
  </div>
</template>

<script lang="ts">
import { web3Service } from '@/web3/web3Service';
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const status = web3Service.status();
    const connect = () => {
      web3Service.init();
    };
    return {
      status,
      connect,
      publicPath: process.env.BASE_URL,
    };
  },
});
</script>
