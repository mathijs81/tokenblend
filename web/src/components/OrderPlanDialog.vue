<template>
  <Dialog
    header="Order plan"
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    class="order-dialog"
  >
    <table class="table table-sm">
      <thead>
        <tr>
          <th scope="col">Amount</th>
          <th scope="col">From</th>
          <th scope="col"></th>
          <th scope="col">To</th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="order in orderList" v-bind:key="order.sendAmount + order.fromToken.name">
          <tr class="align-middle" :class="{ 'table-success': order.success }">
            <td>{{ order.sendAmount.toString() }}</td>
            <td>
              <img
                v-if="order.fromToken.logoUri"
                :src="order.fromToken.logoUri"
                class="token-img me-2"
              />
              {{ order.fromToken.name }}
            </td>
            <td>=></td>
            <td>
              <img
                v-if="order.toToken.logoUri"
                :src="order.toToken.logoUri"
                class="token-img me-2"
              />
              {{ order.toToken.name }}
            </td>
            <td class="text-center">
              <i class="pi pi-spin pi-spinner" v-if="order.inProgress" />
              <i v-else-if="order.success" class="pi pi-check" style="fontsize: 2rem" />
              <span v-else>
                <button v-if="!isEnzyme" class="btn btn-primary" @click="viewBest(order)">
                  View best
                </button>
                <button class="btn btn-primary" @click="execute(order)">Execute best</button>
              </span>
            </td>
          </tr>
          <tr v-if="order.options">
            <td colspan="5">
              <div v-for="option in order.options" v-bind:key="option.platform" class="row">
                <div class="col-3">
                  <img :src="platformLogo(option.platform)" class="platform-img" />
                  {{ option.platform }}
                </div>
                <div v-if="option.inProgress" class="col-9 text-center">
                  <i class="pi pi-spin pi-spinner" />
                </div>
                <template v-else>
                  <div class="col-7">{{ formatResult(option.resultAmount) }}</div>
                  <div class="col-2">TODO: button to execute</div>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="!order.success && order.message" class="table-danger">
            <td colspan="5" class="text-end">
              {{ order.message }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </Dialog>
</template>

<script lang="ts">
import { PlannedOrder } from '@/orderplan/orderplan';
import { compareFixed } from '@/util/numbers';
import { paraswapService } from '@/web3/paraswapService';
import { TransactionResult, uniswapService } from '@/web3/uniswapService';
import { extractErrorMessage } from '@/web3/web3Service';
import { FixedNumber } from 'ethers';
import { defineComponent, PropType, reactive, ref, Ref, watchEffect } from 'vue';

interface TransactionInProgress {
  inProgress?: boolean;
}
interface Option {
  platform: string;
  inProgress: boolean;
  message?: string;
  resultAmount?: FixedNumber;
}
interface OrderOptions {
  options?: Option[];
}
type OrderWithResult = PlannedOrder &
  Partial<TransactionResult> &
  TransactionInProgress &
  OrderOptions;

export default defineComponent({
  name: 'OrderPlanDialog',
  props: {
    visible: Boolean,
    orderPlan: { type: Object as PropType<PlannedOrder[]>, required: true },
    isEnzyme: Boolean,
  },
  emits: ['update:visible'],
  setup(props) {
    const orderList: Ref<OrderWithResult[]> = ref([]);
    watchEffect(() => {
      orderList.value = props.orderPlan.map((order) => ({ ...order }));
      console.log(props.orderPlan, orderList.value);
    });
    const execute = async (order: OrderWithResult) => {
      order.inProgress = true;
      order.message = undefined;
      try {
        let executeFunction: (arg: PlannedOrder) => Promise<TransactionResult>;
        if (props.isEnzyme) {
          executeFunction = (order) => uniswapService.executeForEnzyme(order);
        } else {
          // TODO: find best with paraswap and execute the best.
          executeFunction = (order) => uniswapService.execute(order);
        }
        const result = await executeFunction(order);
        Object.assign(order, result);
      } catch (error: any) {
        console.log(error);
        let message = extractErrorMessage(error);
        order.success = false;
        order.message = message;
      } finally {
        order.inProgress = false;
      }
    };

    return { execute, orderList };
  },
  methods: {
    async viewBest(order: OrderWithResult) {
      const uniswapOption: Option = reactive({
        platform: 'Uniswap',
        inProgress: true,
      });
      const paraswapOption: Option = reactive({
        platform: 'Paraswap',
        inProgress: true,
      });
      order.options = [uniswapOption, paraswapOption];
      const uniswapOutput = uniswapService.getPredictedOutput(order).then((output) => {
        console.log(`got ${output.toString()}`);
        uniswapOption.inProgress = false;
        uniswapOption.resultAmount = FixedNumber.fromValue(output, order.toToken.decimals);
      });
      const paraswapOutput = paraswapService.getPredictedOutput(order).then((output) => {
        console.log(`got ${output.toString()}`);
        paraswapOption.inProgress = false;
        paraswapOption.resultAmount = FixedNumber.fromValue(output, order.toToken.decimals);
      });
      await Promise.all([uniswapOutput, paraswapOutput]);
      order.options.sort((a, b) => {
        if (a.resultAmount !== undefined && b.resultAmount !== undefined) {
          return -compareFixed(a.resultAmount, b.resultAmount);
        } else if (a.resultAmount === undefined) {
          if (b.resultAmount === undefined) {
            return 0;
          } else {
            return 1;
          }
        } else {
          return -1;
        }
      });
    },
    platformLogo(platform: string): string {
      return require('@/assets/' + platform.toLowerCase() + '.png');
    },
    formatResult(result: FixedNumber): string {
      if (result === undefined) {
        return '---';
      }
      return result.toString();
    },
  },
});
</script>

<style lang="scss">
.order-dialog {
  min-width: 30vw;
}
</style>
