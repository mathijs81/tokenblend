<template>
  <div>
    <h3>All Enzyme assets</h3>
    <div>
      <SliderPanel :tokenNames="tokens" />
    </div>
  </div>
</template>

<script lang="ts">
import SliderPanel from '@/components/SliderPanel.vue';
import { getTokens } from '@/data/enzymegraph';
import { defineComponent } from 'vue';
import { asyncComputed } from '@vueuse/core';

export default defineComponent({
  name: 'EnzymeSliders',
  setup() {
    // TODO: if we keep using this, add a filtering textbox to quickly filter on substring of names as
    // there are very many tokens listed.
    const tokens = asyncComputed(async () => {
      const tokenRequestResult = await getTokens();
      const namesOnly = tokenRequestResult.assets.map((asset) => asset.name);
      return namesOnly;
    });
    return { tokens };
  },
  components: { SliderPanel },
});
</script>
