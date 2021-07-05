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
            <td>{{ formatMaxDigits(order.sendAmount.toUnsafeFloat()) }}</td>
            <td>
              <img
                v-if="order.fromToken.logoUri"
                :src="order.fromToken.logoUri"
                class="token-img me-2"
              />
              {{ fromName(order) }}
            </td>
            <td>➜</td>
            <td>
              <img
                v-if="order.toToken.logoUri"
                :src="order.toToken.logoUri"
                class="token-img me-2"
              />
              {{ toName(order) }}
            </td>
            <td class="text-center">
              <img
                v-if="order.chosenPlatform"
                :src="platformLogo(order.chosenPlatform)"
                class="platform-img me-2"
              />
              <i class="pi pi-spin pi-spinner" v-if="order.inProgress" />
              <i v-else-if="order.success" class="pi pi-check" style="fontsize: 2rem" />
              <span v-else>
                <button
                  v-if="!isEnzyme && !order.options && isSwap(order)"
                  class="btn btn-primary me-2"
                  @click="calculateBest(order)"
                >
                  Options <i class="pi pi-angle-double-down" />
                </button>
                <button class="btn btn-primary" @click="execute(order)">
                  {{ executeButtonText(order) }}
                </button>
              </span>
            </td>
          </tr>
          <tr v-if="order.options && !order.success">
            <td colspan="5">
              <div v-for="option in order.options" v-bind:key="option.platform" class="row">
                <div class="col-3 my-auto">
                  <img :src="platformLogo(option.platform)" class="platform-img" />
                  {{ option.platform }}
                </div>
                <div v-if="option.inProgress" class="col-9 text-center my-auto">
                  <i class="pi pi-spin pi-spinner" />
                </div>
                <template v-else>
                  <div class="col-6 my-auto">{{ formatResult(option) }}</div>
                  <div class="col-3 my-auto">
                    <button
                      v-if="option.plan"
                      class="btn btn-primary m-1"
                      @click="execute(order, option.platform, option.plan)"
                    >
                      Execute
                    </button>
                  </div>
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
import { PlannedOrder, OrderType } from '@/orderplan/orderplan';
import { compareBignumber, numberMixin } from '@/util/numbers';
import { ParaSwapPredictedOutput, paraswapService, PredictedOutput } from '@/web3/paraswapService';
import { TransactionResult, uniswapService } from '@/web3/uniswapService';
import { extractErrorMessage } from '@/web3/web3Service';
import { defineComponent, PropType, reactive, ref, Ref, watchEffect } from 'vue';

interface TransactionInProgress {
  inProgress?: boolean;
}
interface Option {
  platform: string;
  inProgress: boolean;
  message?: string;
  plan?: PredictedOutput;
}
interface OrderOptions {
  options?: Option[];
  chosenPlatform?: string;
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
      orderList.value = props.orderPlan.map((order) => ({
        ...order,
        chosenPlatform: order.ordertype == OrderType.SWAP ? undefined : 'idle',
      }));
      console.log(props.orderPlan, orderList.value);
    });
    return { orderList };
  },
  methods: {
    async calculateBest(order: OrderWithResult) {
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
        uniswapOption.plan = output;
      });
      const paraswapOutput = paraswapService.getPredictedOutput(order).then((output) => {
        console.log(`got ${output.toString()}`);
        paraswapOption.inProgress = false;
        paraswapOption.plan = output;
      });
      await Promise.all([uniswapOutput, paraswapOutput]);
      order.options.sort((a, b) => {
        if (a.plan !== undefined && b.plan !== undefined) {
          return -compareBignumber(a.plan.predictedOutput, b.plan.predictedOutput);
        } else if (a.plan === undefined) {
          if (b.plan === undefined) {
            return 0;
          } else {
            return 1;
          }
        } else {
          return -1;
        }
      });
    },
    async execute(order: OrderWithResult, platform?: string, plan?: PredictedOutput) {
      order.inProgress = true;
      order.message = undefined;
      try {
        let executeFunction: (arg: PlannedOrder) => Promise<TransactionResult>;
        if (this.$props.isEnzyme) {
          executeFunction = (order) => uniswapService.executeForEnzyme(order);
        } else {
          if (platform === undefined) {
            // work on a copy so we keep the UI clean
            const copy = { ...order };
            await this.calculateBest(copy);
            if (!copy.options || !copy.options[0]?.plan) {
              throw new Error('No suitable option');
            }
            platform = copy.options[0].platform;
            plan = copy.options[0].plan;
            console.log(`${platform} selected as best: ${plan.predictedOutput.toString()}`);
          }
          switch (platform) {
            case 'Uniswap':
              executeFunction = (order) => uniswapService.execute(order);
              break;
            case 'Paraswap':
              executeFunction = (order) =>
                paraswapService.execute(order, plan as ParaSwapPredictedOutput);
              break;
            default:
              throw new Error('Unknown platform: ' + platform);
          }
          order.chosenPlatform = platform;
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
    },
    platformLogo(platform: string): string {
      return require('@/assets/' + platform.toLowerCase() + '.png');
    },
    formatResult(option: Option): string {
      const result = option.plan?.predictedOutput;
      if (result === undefined) {
        return '---';
      }
      return result.toString();
    },
    isSwap(order: PlannedOrder): boolean {
      return order.ordertype == OrderType.SWAP;
    },
    executeButtonText(order: PlannedOrder): string {
      if (order.ordertype == OrderType.SWAP && !this.isEnzyme) {
        return 'Execute best';
      } else {
        return 'Execute';
      }
    },
    fromName(order: PlannedOrder): string {
      const name = order.fromToken.name;
      if (order.ordertype == OrderType.REDEEM) {
        return 'Idle' + order.fromToken.symbol;
      } else {
        return name;
      }
    },
    toName(order: PlannedOrder): string {
      const name = order.toToken.name;
      if (order.ordertype == OrderType.DEPOSIT) {
        return 'Idle' + order.fromToken.symbol;
      } else {
        return name;
      }
    },
  },
  mixins: [numberMixin],
});
</script>

<style lang="scss">
.order-dialog {
  min-width: 30vw;
}
</style>
