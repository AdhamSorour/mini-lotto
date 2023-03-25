'use client';

import { useEffect, useState } from "react";
import { useChainId } from "./ChainIdProvider";
import { Alchemy, AlchemyProvider, BigNumber, Contract, Network } from "alchemy-sdk";
import deployments from '../../contract_deployments.json';
import artifact from '../../MiniLottoArtifact.json';
import styles from "./page.module.css";
import CreateLotto from './CreateLotto';
import ActiveLottoCard from "./ActiveLottoCard";
import ExpiredLottoCard from "./ExpiredLottoCard";
import CompleteLottoCard from "./CompleteLottoCard";

// export const dynamic = 'auto',
//   dynamicParams = true,
//   revalidate = 0,
//   fetchCache = 'auto',
//   runtime = 'nodejs',
//   preferredRegion = 'auto'

export interface Game {
	id: number,
	capacity: number,
	ticketPrice: BigNumber,
	pool: string[],
	expiration: number,
	refunded: boolean
}

export default function LottosPage() {
	const [activeGames, setActiveGames] = useState<Game[]>([]); 
	const [expiredGames, setExpiredGames] = useState<Game[]>([]);
	const [completeGames, setCompleteGames] = useState<Game[]>([]);

	const [refreshKey, setRefreshKey] = useState<number>(0);
	const refreshData = () => setRefreshKey(key => key + 1);

	const chainId = useChainId();

	useEffect(() => {
		async function getGames() {
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
		
			const contract = new Contract(contractAddress, artifact.abi, provider);
			const games: Game[] = (await contract.getGames()).map(
				(game: any, index: number) => ({
					id: index,
					capacity: game[0].toNumber(),
					ticketPrice: game[1],
					pool: game[2],
					expiration: game[3].toNumber(),
					refunded: game[4]
				})
			);
		
			setActiveGames(games.filter(game =>
				game.pool.length < game.capacity 
				&& (game.expiration === 0 || game.expiration > Date.now()/1000)
			));
			setExpiredGames(games.filter(game =>
				game.pool.length < game.capacity 
				&& (game.expiration !== 0 && game.expiration <= Date.now()/1000)
			));
			setCompleteGames(games.filter(game =>
				game.pool.length === game.capacity
			));
		}

		getGames();
	}, [chainId, refreshKey]);

	return (
		<div>
			<CreateLotto refreshData={refreshData} />
			<div className={styles.grid}>
				{activeGames.map(game => {
					return <ActiveLottoCard key={game.id} {...game} refreshData={refreshData} />
				})}
			</div>
			<div className={styles.grid}>
				{expiredGames.map(game => {
					return <ExpiredLottoCard key={game.id} {...game} refreshData={refreshData} />
				})}
			</div>
			<div className={styles.grid}>
				{completeGames.map(game => {
					return <CompleteLottoCard key={game.id} {...game} refreshData={refreshData} />
				})}
			</div>
		</div>
	)
}
