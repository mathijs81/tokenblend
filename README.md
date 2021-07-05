# TokenBlend

## Asset allocation for your Enzyme funds and Ethereum wallet

This is an entry for the hack.money hackathon 2021.

With this dApp you can perform token asset allocation on either a native Ethereum wallet or an Enzyme vault.

Current features implemented:

* Adjust/rebalance token "blends" with sliders
* Deposit supported tokens in yield-generating Idle tokens (and withdraw when necessary for rebalancing), native wallet only.
* Generate a simple trading plan to reach the desired blend through token swaps.
* Token swaps using Paraswap (native wallet only) or Uniswap.

[ETHGlobal showcase page for TokenBlend](https://showcase.ethglobal.co/hackmoney2021/tokenblend)

## Running

See the source in the `web/` subdirectory for the dApp. The `blockchain/` directory contains utilities to run a hardhat fork of mainnet locally to easily test
uniswap and idle.

