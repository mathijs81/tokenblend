<template>
  <div>
    <table class="table table-striped">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col" class="text-center">Weight</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="token in tokens" v-bind:key="token.name">
          <td>{{ token.name }}</td>
          <td>
            <div class="d-flex flex-column align-items-center">
              <InputText v-model="token.value.value" />
              <Slider v-model="token.value.value" />
            </div>
          </td>
        </tr>
        <tr>
          <td>TOTAL</td>
          <td class="text-center">
            {{ total.toFixed(1) }}
            <button class="ms-2 btn btn-primary" @click="normalize">Make 100%</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, Ref, computed, watchEffect } from 'vue';

interface TokenAndValue {
  name: string;
  value: Ref<number>;
}

export default defineComponent({
  name: 'SliderPanel',
  props: {
    tokenNames: {
      type: Array as PropType<string[]>,
      required: true,
    },
  },
  setup(props) {
    const tokens: TokenAndValue[] = [];

    watchEffect(() => {
      tokens.length = 0;
      if (props.tokenNames) {
        for (let token of props.tokenNames) {
          tokens.push({ name: token, value: ref(0.0) });
        }
      }
    });
    const total = computed(() => {
      var value = 0.0;
      for (let token of tokens) {
        value += token.value.value;
      }
      return value;
    });
    const normalize = () => {
      const current = total.value;
      if (current <= 0) {
        // TODO: add toast system
        alert(`Can't normalize when all sliders are 0`);
      } else {
        for (let token of tokens) {
          const newValue = (token.value.value * 100.0) / current;
          // Round to one decimal
          token.value.value = Math.round(newValue * 10) / 10.0;
        }
      }
    };
    return { tokens, total, normalize };
  },
});
</script>
<style scoped>
.p-inputtext {
  width: 14rem;
}
.p-slider-horizontal {
  width: 14rem;
  margin-bottom: 0.5rem;
}
</style>
