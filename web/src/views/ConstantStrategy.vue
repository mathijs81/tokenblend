<template>
  <div>
    <SliderPanel :tokenNames="tokens" />
  </div>
</template>

<script lang="ts">
import SliderPanel from '@/components/SliderPanel.vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ConstantStrategy',
  setup() {
    // TODO: make flexible
    const tokens = ['WETH', 'WBTC', 'USDC', 'MLN', 'UNI-V2'];
    return { tokens };
  },
  components: { SliderPanel },
});
</script>
