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
          <td colspan="2"></td>
          <td>{{ formatValueNumber(totalAmount) }}</td>
          <td class="text-end">
            {{ totalPercentage.toFixed(1) }}
          </td>
        </tr>

        <tr v-for="token in tokenData" v-bind:key="token.name">
          <td>
            <img v-if="token.logoUri" :src="token.logoUri" class="token-img me-2" /><a
              :title="token.id"
              >{{ token.name }}</a
            >
          </td>
          <td :title="formatPriceLong(token)">{{ formatPrice(token) }}</td>
          <td>{{ formatOwned(token) }}</td>
          <td>{{ formatValue(token) }}</td>
          <td>
            <div class="d-flex flex-column align-items-center">
              <InputText
                :modelValue="percentageMap[token.id]"
                @update:modelValue="percentageMap[token.id] = parseFloat($event)"
              />
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
import { debouncedWatch } from '@vueuse/core';
import { computed, defineComponent, PropType, reactive, watch } from 'vue';

function adjustRatios(
  before: Record<string, number>,
  after: Record<string, number>,
  defaultKey: string
) {
  let N = 0;
  while (N++ < 5) {
    const totalAfter = Object.values(after).reduce((a, b) => a + b, 0.0);
    if (totalAfter > 0.001 && Math.abs(totalAfter - 100) > 0.001) {
      let adjustment = 100 - totalAfter;
      const changedKeys = new Set(
        Object.keys(before).filter((key) => Math.abs(before[key] - after[key]) > 0.0001)
      );
      // If the user didn't touch WETH, we can try to correct everything by adjusting that.
      if (!changedKeys.has(defaultKey)) {
        const newDefault = Math.max(0, after[defaultKey] + adjustment);
        adjustment -= newDefault - after[defaultKey];
        after[defaultKey] = newDefault;
        changedKeys.add(defaultKey);
      }

      if (Math.abs(adjustment) > 0.001) {
        // We need to apply the adjustment to other tokens, ideally ones that haven't been moved
        const unmovedTotal = Object.keys(after)
          .filter((key) => !changedKeys.has(key))
          .map((key) => after[key])
          .reduce((a, b) => a + b, 0.0);
        if (unmovedTotal > 0.01) {
          const adjustmentPerValue = adjustment / unmovedTotal;
          Object.keys(after)
            .filter((key) => !changedKeys.has(key))
            .forEach((key) => {
              const current = after[key];
              const adjust = adjustmentPerValue * current;
              after[key] += adjust;
            });
        } else {
          // Just apply it to everything equally
          const total = Object.values(after).reduce((a, b) => a + b, 0.0);
          const adjustmentPerValue = adjustment / total;
          Object.keys(after).forEach((key) => {
            const current = after[key];
            const adjust = adjustmentPerValue * current;
            after[key] += adjust;
          });
        }
      }
      Object.keys(after).forEach((key) => {
        after[key] = Math.max(0, Math.min(100, parseFloat(after[key].toFixed(1))));
      });
    } else {
      break;
    }
  }
}

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

    const wethContract = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const prevMap = {};
    const normalize = () => {
      adjustRatios(prevMap, percentageMap, wethContract);
      Object.assign(prevMap, percentageMap);
    };

    debouncedWatch(
      percentageMap,
      () => {
        normalize();
      },
      { debounce: 500 }
    );

    const totalPercentage = computed(() => {
      var value = 0.0;
      for (let [, itemValue] of Object.entries(percentageMap)) {
        value += itemValue;
      }
      return value;
    });

    watch(percentageMap, () => {
      emit('update:modelValue', percentageMap);
    });

    const totalAmount = computed(() => {
      var value = 0.0;
      for (let [, token] of Object.entries(props.tokenData)) {
        value += token.ownedAmount.toUnsafeFloat() * token.value;
      }
      return value;
    });

    return { percentageMap, totalPercentage, totalAmount };
  },
  methods: {
    formatPrice(token: TokenData): string {
      return token.value.toFixed(1);
    },
    formatPriceLong(token: TokenData): string {
      return token.value.toString();
    },
    formatOwned(token: TokenData): string {
      return token.ownedAmount.toUnsafeFloat().toString();
    },
    formatValue(token: TokenData): string {
      return this.formatValueNumber(token.ownedAmount.toUnsafeFloat() * token.value);
    },
    formatValueNumber(num: number): string {
      return num.toFixed(1);
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
