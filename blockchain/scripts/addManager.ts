
import { IntegrationManager } from '@enzymefinance/protocol';
import hre from "hardhat";
import { providers, Wallet, utils } from 'ethers';


const util = require("util");
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


async function main() {
  const ethers = hre.ethers;

  const ownerAddress = "0xb3f8d948b26c4805f945c01fab023c4c8a6efef2";

  await hre.network.provider.request({
  	method: "hardhat_impersonateAccount",
  	params: [ ownerAddress ]
  });
  const signer = await ethers.provider.getSigner(ownerAddress);


  // Code taken from https://sdk.enzyme.finance/examples/adding-authorized-traders
  
  // the IntegrationManager contract address, available at contracts.enzyme.finance
const integrationManagerAddress = '0x965ca477106476B4600562a2eBe13536581883A6';
​
// the Vault's comptroller address, available at the vault dashboard at app.enzyme.finance
const vaultComptrollerAddress = '0xc4925fe4f5c0fe86148b82212f9ba3aca50b2167';
const vaultAddress = '0xded69068a94776a23f5bdafc6b4c6894bc88e82c';
​
// an arbitrary address; we'll permission it if it's not already and
// revoke permission if it is.
// one of the hardhat test addresses:
const arbitraryAddress = '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097';
​
// instantiate the Integration Manager contract
const integrationManagerContract = new IntegrationManager(
    integrationManagerAddress,
    signer,
);
​
// determine whether the arbitrary address is currently permissioned
const isCurrentlyPermissioned = await integrationManagerContract.isAuthUserForFund(
    vaultComptrollerAddress,
    arbitraryAddress,
);
console.log(`user permissioned: ${isCurrentlyPermissioned}`);
​
// conditionally instantiate the transaction
const authUserTx = isCurrentlyPermissioned
    ? integrationManagerContract.removeAuthUserForFund.args(
      vaultComptrollerAddress,
        arbitraryAddress,
    ) 
    : integrationManagerContract.addAuthUserForFund.args(
      vaultComptrollerAddress,
        arbitraryAddress,
    );
​
// send the transaction
const authUserTxReceipt = await authUserTx.send();
console.log('Pending transaction:', authUserTxReceipt);
console.log('Transaction included in block number:', authUserTxReceipt.blockNumber);
​


  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [ ownerAddress ]}
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
