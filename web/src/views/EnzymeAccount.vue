<template>
  <div v-if="fund">
    <h2>{{ fund.name }}</h2>
    <div class="row">
      <!-- bit little space maybe to put these two panels next to eachother, 
        alternative may be TabView: https://www.primefaces.org/primevue/showcase/#/tabview -->
      <div class="col">
        <EnzymeSliders />
      </div>
      <div class="col">
        <FarmingStrategy />
      </div>
    </div>
  </div>
  <div v-else>Loading...</div>
</template>

<script lang="ts">
import { enzymeService } from '@/web3/enzymeService';
import { computed, defineComponent, watchEffect } from 'vue';
import EnzymeSliders from './EnzymeSliders.vue';
import FarmingStrategy from './FarmingStrategy.vue';

export default defineComponent({
  props: {
    account: String,
  },
  setup(props) {
    watchEffect(() => {
      const selectedFund = props.account;
      const availableFunds = enzymeService.status().funds;
      if (selectedFund) {
        const fund = availableFunds.find(
          (fund) => fund.id.toLowerCase() == selectedFund.toLowerCase()
        );
        if (fund) {
          enzymeService.selectFund(fund);
        }
      }
    });
    return { fund: computed(() => enzymeService.status().selectedFund) };
  },
  components: { EnzymeSliders, FarmingStrategy },
});
</script>
