<template>
  <div>
    <table class="table table-striped table-sm">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Current balance</th>
          <th scope="col">Current value</th>
          <th scope="col" class="text-center">Desired weight</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total</td>
          <td></td>
          <td></td>
          <td class="text-center">
            {{ totalPercentage.toFixed(1) }}
            <button class="ms-2 btn btn-primary" @click="normalize">Make 100%</button>
          </td>
        </tr>

        <tr v-for="token in tokenData" v-bind:key="token.name">
          <td>{{ token.name }}</td>
          <td>{{ token.ownedAmount }}</td>
          <td>{{ token.ownedAmount * token.value }}</td>
          <td>
            <div class="d-flex flex-column align-items-center">
              <InputText v-model="percentageMap[token.id]" />
              <Slider v-model="percentageMap[token.id]" />
            </div>
          </td>
        </tr>
        <tr>
          <td>Total</td>
          <td></td>
          <td></td>
          <td class="text-center">
            {{ totalPercentage.toFixed(1) }}
            <button class="ms-2 btn btn-primary" @click="normalize">Make 100%</button>
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
        for (let [_, token] of Object.entries(props.tokenData)) {
          if (!(token.id in percentageMap)) {
            percentageMap[token.id] = 0.0;
          }
        }
      }
    );

    const totalPercentage = computed(() => {
      var value = 0.0;
      for (let [_, itemValue] of Object.entries(percentageMap)) {
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
});
</script>
<style scoped>
.p-inputtext {
  width: 14rem;
  padding: 0.2rem;
  font-size: 0.8rem;
}
.p-slider-horizontal {
  width: 14rem;
  margin-bottom: 0.1rem;
}
</style>
