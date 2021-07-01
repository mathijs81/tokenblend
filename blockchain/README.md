## hardhat setup for easy dev testing

run

```
pnpm i
```

Sign up for an account at alchemy and get an API key for a dev/mainnet project. Then you can start a local node with the following command

```
pnpx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/[API-KEY] --fork-block-number 12727578
```

You also need to create a special metamask configuration for this network:
Settings > Networks > Add network
* Name: whatever you want (e.g. local mainnet fork)
* New RPC URL: http://localhost:8545/
* Chain id: 1


After that, run the following:
```
pnpx hardhat run scripts/addManager.ts --network localhost
```
That adds the hardhat test address (Account #14: `0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097` -- Private Key: `0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa`) as one of the owners to the fund "Techemy Capital - Holistic ETH-BTC fund".
 

For the 'native' wallet testing, the following command is useful:
```
pnpx hardhat run scripts/depositWeth.ts --network localhost
```

This will put 5 WETH in to the test wallet.
