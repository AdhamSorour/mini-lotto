import detectEthereumProvider from '@metamask/detect-provider';
import deployments from '../../contract_deployments.json';
import artifact from '../../MiniLottoArtifact.json';
import { Alchemy, AlchemyProvider, Network, Contract } from "alchemy-sdk";
import { providers } from "ethers";

export async function getContractWithProvider(chainId: string) : Promise<Contract> {
	const { contractAddress, apiKey, network } = (() => {
		switch (chainId) {
			case "0x1": return {
				contractAddress: deployments.proxy.mainnet,
				apiKey: process.env.NEXT_PUBLIC_ALCHEMY_MAINNET_API_KEY,
				network: Network.ETH_MAINNET
			}
			case "0x5": return {
				contractAddress: deployments.proxy.goerli,
				apiKey: process.env.NEXT_PUBLIC_ALCHEMY_GOERLI_API_KEY,
				network: Network.ETH_GOERLI
			}		
			default: return {
				contractAddress: deployments.proxy.sepolia,
				apiKey: process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_API_KEY,
				network: Network.ETH_SEPOLIA
			}	
		}
	})();
	const alchemy = new Alchemy({ apiKey, network });
	const provider: AlchemyProvider = await alchemy.config.getProvider();

	return new Contract(contractAddress, artifact.abi, provider);
}

export async function getContractWithSigner(chainId: string, account: string | null) : Promise<Contract | null> {
	const ethereum: any = await detectEthereumProvider();
	if (!ethereum) {
		alert("MetaMask wallet required");
		return null;
	}

	if (!account) {
		const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
		if (!accounts[0]) {
			alert("No accounts connected\nPlease connect your wallet");
			return null;
		}
	}

	if (chainId != ethereum.chainId) {
		if (!await matchChain(chainId)) {
			alert("Network mismatch");
			return null;
		}
	}
	const contractAddress = (() => {switch(chainId) {
			case "0x1": return deployments.proxy.mainnet;
			case "0x5": return deployments.proxy.goerli;
			default: return deployments.proxy.sepolia;
		}
	})();

	const signer = new  providers.Web3Provider(ethereum).getSigner(); 
	return new Contract(contractAddress, artifact.abi, signer);
}

async function matchChain(chainId: string) : Promise<boolean> {
	const ethereum: any = await detectEthereumProvider();
	if (ethereum && chainId != ethereum.chainId) {
		try {
			await ethereum.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId }], // chainId must be in hexadecimal numbers
			});
			return true;
		} catch (error: any) {
			// This error code indicates that the chain has not been added to MetaMask
			// if it is not, then install it into the user MetaMask
			if (error.code === 4902) {
				alert("Selected chain not installed in metamask, please install it before transacting ");
			//   try {
			//     await ethereum.request({
			//       method: 'wallet_addEthereumChain',
			//       params: [
			//         {
			//           chainId: network,
			//           rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
			//         },
			//       ],
			//     });
			//   } catch (addError) {
			//     console.error(addError);
			//   }
			}
			console.error(error);
		}
	}
	return false;
}