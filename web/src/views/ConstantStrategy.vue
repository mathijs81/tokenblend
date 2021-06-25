<template>
  <div>
    <SliderPanel :tokenData="tokens" v-model="distribution" />
  </div>
</template>

<script lang="ts">
import SliderPanel from '@/components/SliderPanel.vue';
import { defineComponent } from 'vue';
import { calcPercentageMap, TokenData } from '@/util/tokens';

export default defineComponent({
  name: 'ConstantStrategy',
  setup() {
    const tokens: TokenData[] = [
      { name: 'WETH', id: '0xh687943gjas', ownedAmount: 2.0, value: 2000 },
      { name: 'USDC', id: '0xaskdfjasdf', ownedAmount: 500, value: 1.0 },
      { name: 'WBTC', id: '0xjaksdfasdf', ownedAmount: 0.05, value: 40000 },
    ];
    const distribution: Record<string, number> = calcPercentageMap(tokens);
    return { tokens, distribution };
  },
  components: { SliderPanel },
});
</script>
