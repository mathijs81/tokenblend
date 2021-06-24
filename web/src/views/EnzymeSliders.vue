<template>
  <div>
    <div v-if="state.connected">
      <div v-if="funds.length > 0">
        <h3>Your funds</h3>
        <div v-for="fund in funds" v-bind:key="fund.id">
          <b>{{ fund.name }}</b
          ><small>{{ fund.id }}</small>
        </div>
      </div>
      <div v-else>{{ state.address }} has no enzyme funds</div>
    </div>
    <h3>All Enzyme assets</h3>
    <div>
      <SliderPanel :tokenNames="tokens" />
    </div>
  </div>
</template>

<script lang="ts">
import SliderPanel from '@/components/SliderPanel.vue';
import { getTokens } from '@/data/enzymegraph';
import { computed, defineComponent } from 'vue';
import { asyncComputed } from '@vueuse/core';
import { web3Service } from '@/web3/web3Service';
import { enzymeService } from '@/web3/enzymeService';

export default defineComponent({
  name: 'EnzymeSliders',
  setup() {
    // TODO: if we keep using this, add a filtering textbox to quickly filter on substring of names as
    // there are very many tokens listed.
    const tokens = asyncComputed(async () => {
      const tokenRequestResult = await getTokens(web3Service.isProd());
      const namesOnly = tokenRequestResult.assets.map((asset) => asset.name);
      return namesOnly;
    });
    const funds = computed(() => enzymeService.getFunds());
    return { tokens, funds, state: web3Service.status() };
  },
  components: { SliderPanel },
});
</script>
