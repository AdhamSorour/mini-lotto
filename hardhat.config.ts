import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { HardhatRuntimeEnvironment, RunSuperFunction, TaskArguments } from "hardhat/types";
import { copyFileSync, readFileSync, writeFileSync } from "fs";
import { Contract, ContractFactory } from "ethers";
import { proxy } from './app/contract_deployments.json';
require('dotenv').config({ path: "./.env" });

task(
  "compile",
  async function (
    taskArgs: TaskArguments,
    hre: HardhatRuntimeEnvironment,
    runSuper: RunSuperFunction<TaskArguments>) {
      await runSuper(taskArgs);
      copyFileSync(
        './artifacts/contracts/MiniLottoV3.sol/MiniLottoV3.json',
        './app/MiniLottoArtifact.json'
      )

      console.log("copied V3 artiface to 'app/MiniLottoArtifact.json`")
  }
);

task('deployProxy', 'Deploys the proxy contract to the selected network')
  .addParam('implementation', 'The address of the implementation contract')
  .setAction(async function (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const { implementation } = taskArgs;
    
    const ProxyFactory: ContractFactory = await hre.ethers.getContractFactory("MiniLottoProxy");
    const proxyContract: Contract = await ProxyFactory.deploy(implementation, []);

    await proxyContract.deployed();

    console.log(`proxy contract deployed to address: ${proxyContract.address} on network: ${hre.network.name}`);
    await updateProxyDeployment(proxyContract.address, hre.network.name);
    console.log("address updated in 'deployments.json'");
  })
;

task('deployImplementation', 'Deploys an implementation contract to the selected network')
  .addParam('v', 'The version of the implementation contract to deploy')
  .setAction(async function (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const { v } = taskArgs;
    const contractName: string = "MiniLottoV" + v;

    const Contract: ContractFactory = await hre.ethers.getContractFactory(contractName);
    const contract: Contract = await Contract.deploy();

    await contract.deployed();

    console.log(`${contractName} deployed to address: ${contract.address} on network: ${hre.network.name}`);
    await updateImplementationDeployment(contract.address, hre.network.name, v);
    console.log("address updated in './app/contract_deployments.json'");
  })
;

task('upgrade', "Upgrades the implementation of the deployed proxy on the selected network")
  .addParam('implementation', 'The new implementation address')
  .setAction(async function (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const { implementation } = taskArgs;

    const network = hre.network.name as keyof typeof proxy;
    const proxyContract: Contract = await hre.ethers.getContractAt("MiniLottoV1", proxy[network]);
    await proxyContract.upgradeTo(implementation)

    console.log(`proxy contract upgraded`)
  })
;

async function updateProxyDeployment(address: string, network: string) {
  let info = JSON.parse(readFileSync('./app/contract_deployments.json').toString());
  if (!info.proxy) info.proxy = {};
  info.proxy[network] = address;
  writeFileSync('./app/contract_deployments.json', JSON.stringify(info));
}

async function updateImplementationDeployment(address: string, network: string, version: string) {
  let info = JSON.parse(readFileSync('./app/contract_deployments.json').toString());
  if (!info.implementations) info.implementations = {};
  if (!info.implementations[version]) info.implementations[version] = {};
  info.implementations[version][network] = address;
  writeFileSync('./app/contract_deployments.json', JSON.stringify(info));
}

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    goerli: {
      url: process.env.ALCHEMY_GOERLI_URL,
      accounts: [`${process.env.PRIVATE_KEY}`]
    },
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL,
      accounts: [`${process.env.PRIVATE_KEY}`]
    },
    mainnet: {
      url: process.env.ALCHEMY_MAINNET_URL,
      accounts: [`${process.env.PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  }
};

export default config;
