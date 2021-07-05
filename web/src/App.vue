<template>
  <div>
    <div class="menubar">
      <div class="container">
        <Menubar :model="items">
          <template #start>
            <router-link to="/" class="logo"><img src="@/assets/logo.png" class="img-fluid"> TokenBlend</router-link>
          </template>
        </Menubar>
      </div>
    </div>
    <div class="container">
      <router-view />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref, watchEffect } from 'vue';
import { enzymeService } from './web3/enzymeService';
import { web3Service } from './web3/web3Service';

export default defineComponent({
  setup() {
    const state = web3Service.status();
    // Weird, the menu only seems to work when items is a ref (not when it's a computed function)
    const items: Ref<any[]> = ref([]);
    watchEffect(() => {
      let walletLabel = 'Wallet...';
      const address = state.address;
      if (address) {
        walletLabel = `Wallet 0x${address.substr(0, 6)}...${address.substr(address.length - 6)}`;
      }
      const funds = enzymeService.getFunds();
      let enzymeItems = [];
      if (funds.length == 0) {
        enzymeItems.push({ label: 'No enzyme funds' });
      } else {
        enzymeItems = funds.map((fund) => ({
          label: fund.name,
          icon: 'pi pi-money-bill',
          to: { name: 'EnzymeAccount', params: { account: fund.id } },
        }));
      }

      items.value = [
        {
          label: walletLabel,
          icon: 'pi pi-wallet',
          to: { name: 'WalletAccount' },
        },
        {
          label: 'Enzyme vaults',
          icon: 'pi pi-money-bill',
          items: enzymeItems,
        },
      ];
    });
    return { state, items };
  },
});
</script>
<style lang="scss" scoped>
.logo img {
  width: 2rem;
  height: 2rem;
}
</style>