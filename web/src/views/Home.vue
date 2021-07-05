<template>
  <div class="home">
    <div class="hero position-relative text-center p-4">
      <h1 class="display-1"><img src="@/assets/logo.png" /> TokenBlend</h1>
      <h2 class="h2">Asset allocation for your Enzyme funds and Ethereum wallet</h2>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Home',
});
</script>

<style lang="scss" scoped>
.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url(https://images.unsplash.com/photo-1529517986296-847580704921?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1650&q=80);
  background-size: cover;
  filter: brightness(50%);
  z-index: -1;
}
.hero {
  margin-top: -0.5rem;
  color: white;
}
.display-1 {
  padding-top: 10rem;
  padding-bottom: 4rem;
}
.h2 {
  padding-bottom: 8rem;
}
</style>
