
import { utils } from 'ethers';
import hre from "hardhat";

const wethAbi = require('@enzymefinance/protocol/artifacts/WETH.json');

async function main() {
  const ethers = hre.ethers;
  const testAddress = "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097";
  const signer = await ethers.getSigner(testAddress);

  const weth = await ethers.getContractAt(wethAbi, "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", signer);
  console.log(await weth.connect(signer).deposit({ value: utils.parseEther("5.0") }));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
