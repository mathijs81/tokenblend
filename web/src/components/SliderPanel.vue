<template>
  <div>
    <Dropdown
      v-model="selectedDistribution"
      :options="distributions"
      optionLabel="name"
      placeholder="Select distribution"
    />

    <table class="table table-striped table-sm">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col" class="text-end">Price</th>
          <th scope="col" class="text-end">Current balance</th>
          <th scope="col" class="text-end">Current value</th>
          <th scope="col" class="text-end">Desired weight</th>
        </tr>
      </thead>
      <tbody>
        <tr class="align-middle">
          <td><b>Total</b></td>
          <td colspan="2"></td>
          <td class="text-end">{{ formatDollars(totalAmount) }}</td>
          <td class="text-end">
            {{ totalPercentage.toFixed(1) }}
          </td>
        </tr>

        <tr v-for="token in tokenData" v-bind:key="token.name" class="align-middle">
          <td>
            <img v-if="token.logoUri" :src="token.logoUri" class="token-img me-2" /><a
              :title="token.id"
              >{{ token.name }}</a
            >
          </td>
          <td :title="formatPriceLong(token)" class="text-end">{{ formatPrice(token) }}</td>
          <td class="text-end" :title="tokenTitle(token)">
            {{ formatOwned(token) }}
            <span v-if="withStaking" class="staking">
              <span v-if="isStakedToken(token)">
                <svg viewBox="0 0 42 42" class="staking-donut">
                  <circle
                    class="donut-ring"
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="#ffd76e"
                    stroke-width="5"
                  ></circle>
                  <circle
                    class="donut-segment"
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="#0c58c2"
                    stroke-width="5"
                    :stroke-dasharray="getStroke(token)"
                    stroke-dashoffset="0"
                  ></circle></svg
                ><img src="@/assets/idle.png" class="staking-img" />
              </span>
            </span>
          </td>
          <td class="text-end">{{ formatValue(token) }}</td>
          <td class="text-end">
            <div class="d-flex flex-column align-items-end">
              <InputText
                :modelValue="formatMaxDigits(percentageMap[token.id])"
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
import { Distribution, getDistributions } from '@/util/tokenDistribution';
import { asyncComputed, debouncedWatch } from '@vueuse/core';
import { computed, defineComponent, PropType, reactive, Ref, ref, watch } from 'vue';
import Dropdown from 'primevue/dropdown';
import { numberMixin } from '@/util/numbers';
import { StakedToken } from '@/util/stakedTokens';

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
        let current = after[key];
        if (isNaN(current)) {
          current = 0;
        }
        after[key] = Math.max(0, Math.min(100, parseFloat(current.toFixed(3))));
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
      type: Array as PropType<TokenData[] | StakedToken[]>,
      required: true,
    },
    modelValue: Object as PropType<Record<string, number>>,
    withStaking: Boolean,
  },
  components: { Dropdown },
  setup(props, { emit }) {
    const percentageMap: Record<string, number> = reactive({});
    var wethContract = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
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
        if (
          percentageMap[wethContract] === undefined &&
          wethContract.toLowerCase() in percentageMap
        ) {
          wethContract = wethContract.toLowerCase();
        }
        for (let [, token] of Object.entries(props.tokenData)) {
          if (!(token.id in percentageMap)) {
            percentageMap[token.id] = 0.0;
          }
        }
      }
    );
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

    const selectedDistribution: Ref<Distribution | null> = ref(null);
    const distributions = asyncComputed(async () => getDistributions(props.tokenData));
    watch(selectedDistribution, () => {
      const values = selectedDistribution.value?.map;
      if (values) {
        Object.keys(percentageMap).forEach((key) => {
          percentageMap[key] = 0.0;
        });
        Object.assign(percentageMap, values);
      }
    });
    return { percentageMap, totalPercentage, totalAmount, selectedDistribution, distributions };
  },
  methods: {
    formatPrice(token: TokenData): string {
      if (token.value === 0.0) {
        return '---';
      }
      return this.formatDollarPrice(token.value);
    },
    formatPriceLong(token: TokenData): string {
      return token.value.toString();
    },
    formatOwned(token: TokenData): string {
      return this.formatMaxDigits(token.ownedAmount.toUnsafeFloat());
    },
    formatValue(token: TokenData): string {
      return this.formatDollars(token.ownedAmount.toUnsafeFloat() * token.value);
    },
    tokenTitle(token: TokenData): string {
      return 'description' in token ? (token as StakedToken).description : '';
    },
    isStakedToken(token: TokenData): boolean {
      return (
        'hasStaked' in token &&
        (token as StakedToken).hasStaked &&
        token.ownedAmount.toUnsafeFloat() > 0
      );
    },
    getStroke(_token: TokenData): string {
      const token = _token as StakedToken;
      // Needs to be %, 100 - %
      const stakedPercentage =
        (token.stakedUnderlyingValue.toUnsafeFloat() / token.ownedAmount.toUnsafeFloat()) * 100;
      return `${stakedPercentage.toFixed(3)} ${(100 - stakedPercentage).toFixed(3)}`;
    },
  },
  mixins: [numberMixin],
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
.staking {
  position: relative;
  text-align: center;
  width: 2rem;
  display: inline-block;
}
.staking-donut {
  width: 1.8rem;
  height: 1.8rem;
}
.staking-img {
  position: absolute;
  margin: auto;
  height: 0.8rem;
  width: 0.8rem;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
}
</style>
