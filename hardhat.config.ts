import { HardhatUserConfig, task, types } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { HardhatRuntimeEnvironment, RunSuperFunction, TaskArguments } from "hardhat/types";
import { copyFileSync, readFileSync, writeFileSync } from "fs";
import { Contract, ContractFactory } from "ethers";
require('dotenv').config({ path: "./.env" });

task(
  "compile",
  async function (
    taskArgs: TaskArguments,
    hre: HardhatRuntimeEnvironment,
    runSuper: RunSuperFunction<TaskArguments>) {
      await runSuper();
      copyFileSync(
        './artifacts/contracts/MiniLottoV2.sol/MiniLottoV2.json',
        './app/MiniLottoArtifact.json'
      )
  }
);

task('deployProxy', 'Deploys the proxy contract to the selected network')
  .addParam('implementation', 'The address of the implementation contract')
  .setAction(async function (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const { implementation } = taskArgs;
    
    const Proxy: ContractFactory = await hre.ethers.getContractFactory("MiniLottoProxy");
    const proxy: Contract = await Proxy.deploy(implementation, []);

    await proxy.deployed();

    console.log(`proxy contract deployed to address: ${proxy.address} on network: ${hre.network.name}`);
    await updateProxyDeployment(proxy.address, hre.network.name);
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
  }
};

export default config;
