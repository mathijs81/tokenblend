<template>
  <div>
    <table class="table table-striped table-sm">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Price</th>
          <th scope="col">Current balance</th>
          <th scope="col">Current value</th>
          <th scope="col" class="text-center">Desired weight</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><b>Total</b></td>
          <td colspan="4" class="text-end">
            {{ totalPercentage.toFixed(1) }}
            <button class="ms-2 btn btn-primary" @click="normalize">Normalize</button>
          </td>
        </tr>

        <tr v-for="token in tokenData" v-bind:key="token.name">
          <td>{{ token.name }}</td>
          <td>{{ formatPrice(token) }}</td>
          <td>{{ formatOwned(token) }}</td>
          <td>{{ formatValue(token) }}</td>
          <td>
            <div class="d-flex flex-column align-items-center">
              <InputText v-model="percentageMap[token.id]" />
              <Slider v-model="percentageMap[token.id]" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { calcPercentageMap, TokenData } from '@/util/tokens';
import { computed, defineComponent, PropType, reactive, watch } from 'vue';

export default defineComponent({
  name: 'SliderPanel',
  props: {
    tokenData: {
      type: Array as PropType<TokenData[]>,
      required: true,
    },
    modelValue: Object as PropType<Record<string, number>>,
  },
  setup(props, { emit }) {
    const percentageMap: Record<string, number> = reactive({});
    watch(
      () => [props.tokenData, props.modelValue],
      () => {
        if (props.modelValue) {
          for (let [id, value] of Object.entries(props.modelValue)) {
            percentageMap[id] = value;
          }
        } else {
          Object.assign(percentageMap, calcPercentageMap(props.tokenData));
        }
        for (let [, token] of Object.entries(props.tokenData)) {
          if (!(token.id in percentageMap)) {
            percentageMap[token.id] = 0.0;
          }
        }
      }
    );

    const totalPercentage = computed(() => {
      var value = 0.0;
      for (let [, itemValue] of Object.entries(percentageMap)) {
        value += itemValue;
      }
      return value;
    });
    const normalize = () => {
      const current = totalPercentage.value;
      if (current <= 0) {
        // TODO: add toast system
        alert(`Can't normalize when all sliders are 0`);
      } else {
        for (let [id, value] of Object.entries(percentageMap)) {
          const newValue = (value * 100.0) / current;
          // Round to one decimal
          percentageMap[id] = Math.round(newValue * 10) / 10.0;
        }
      }
    };

    watch(percentageMap, () => {
      emit('update:modelValue', percentageMap);
    });

    return { percentageMap, totalPercentage, normalize };
  },
  methods: {
    formatPrice(token: TokenData): string {
      return token.value.toFixed(1);
    },

    formatOwned(token: TokenData): string {
      return token.ownedAmount.toFixed(1);
    },

    formatValue(token: TokenData): string {
      return (token.ownedAmount * token.value).toFixed(1);
    },
  },
});
</script>
<style scoped>
.p-inputtext {
  width: 8rem;
  padding: 0.2rem;
  font-size: 0.8rem;
}
.p-slider-horizontal {
  width: 8rem;
  margin-bottom: 0.1rem;
}
</style>
