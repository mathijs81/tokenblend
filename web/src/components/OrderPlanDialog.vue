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
          <tr class="align-middle" :class="{ 'table-success': order.success}">
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
              <button v-else class="btn btn-primary" @click="execute(order)">Execute</button>
            </td>
          </tr>
          <tr v-if="!order.success && order.message" class="table-danger">
            <td colspan="5" class="text-end">
                {{order.message}}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </Dialog>
</template>

<script lang="ts">
import { PlannedOrder } from '@/orderplan/orderplan';
import { TransactionResult, uniswapService } from '@/web3/uniswapService';
import { extractErrorMessage } from '@/web3/web3Service';
import { defineComponent, PropType, ref, Ref, watchEffect } from 'vue';

interface TransactionInProgress {
  inProgress?: boolean;
}
type OrderWithResult = PlannedOrder & Partial<TransactionResult> & TransactionInProgress;

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
});
</script>

<style lang="scss">
.order-dialog {
  min-width: 30vw;
}
</style>
