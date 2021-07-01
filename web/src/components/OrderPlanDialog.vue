<template>
  <Dialog header="Order plan" :visible="visible" @update:visible="$emit('update:visible', $event)">
    <div
      v-for="order in orderPlan"
      v-bind:key="order.sendAmount + order.fromToken.name"
      class="row"
    >
      <div class="col-9">
        {{ order.sendAmount.toString() }} {{ order.fromToken.name }} =>
        {{ order.toToken.name }}
      </div>
      <div class="col-3">
        <button class="btn btn-primary" @click="execute(order)">Execute</button>
      </div>
    </div>
  </Dialog>
</template>

<script lang="ts">
import { PlannedOrder } from '@/orderplan/orderplan';
import { TransactionResult, uniswapService } from '@/web3/uniswapService';
import { extractErrorMessage } from '@/web3/web3Service';
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  name: 'OrderPlanDialog',
  props: {
    visible: Boolean,
    orderPlan: { type: Object as PropType<PlannedOrder[]>, required: true },
    isEnzyme: Boolean,
  },
  emits: ['update:visible'],
  setup(props) {
    const execute = async (order: PlannedOrder) => {
      try {
        let executeFunction: (arg: PlannedOrder) => Promise<TransactionResult>;
        if (props.isEnzyme) {
          executeFunction = (order) => uniswapService.executeForEnzyme(order);
        } else {
          executeFunction = (order) => uniswapService.execute(order);
        }
        const result = await executeFunction(order);
        if (result.success) {
          alert(`Success! ${result.message}`);
        } else {
          alert(`Failure. ${result.message}`);
        }
      } catch (error: any) {
        console.log(error);
        let message = extractErrorMessage(error);
        alert(`There was a problem: ${message}`);
      }
    };

    return { execute };
  },
});
</script>
