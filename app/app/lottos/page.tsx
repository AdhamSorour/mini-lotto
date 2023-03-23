import { Alchemy, AlchemyProvider, Contract, Network } from "alchemy-sdk";
import deployments from '../../contract_deployments.json';
import artifact from '../../MiniLottoArtifact.json';
import styles from "./page.module.css";
import LottoCard from "./LottoCard";
import CreateLotto from './CreateLotto';
require('dotenv').config({ path: "../.env" });

export interface Game {
	id: number,
	capacity: number,
	ticketPrice: number,
	pool: string[],
	expiration: number,
	refunded: boolean
}

async function getGames() {
	const alchemy = new Alchemy({
		apiKey: process.env.ALCHEMY_SEPOLIA_API_KEY,
		network: Network.ETH_SEPOLIA
	});
	const provider: AlchemyProvider = await alchemy.config.getProvider();

	const contract = new Contract(deployments.proxy.sepolia, artifact.abi, provider);
	const games: Game[] = (await contract.getGames()).map(
		(game: any, index: number) => ({
			id: index,
			capacity: game[0].toString(),
			ticketPrice: game[1].toString(),
			pool: game[2],
			expiration: game[3].toString(),
			refunded: game[4]
		})
	);

	const complete: Game[] = games.filter(game =>
		game.pool.length == game.capacity
	);
	const expired: Game[] = games.filter(game =>
		game.pool.length < game.capacity && game.expiration != 0 && game.expiration <= Date.now() / 1000
	);
	const active: Game[] = games.filter(game =>
		game.pool.length < game.capacity && game.expiration == 0 || game.expiration > Date.now() / 1000
	);

	return { active, expired, complete };
}

export default async function LottosPage() {
	const { active, expired, complete } = await getGames();

	return (
		<div>
			<CreateLotto />
			<div className={styles.grid}>
				{active?.map(game => {
					return <LottoCard key={game.id} {...game} />
				})}
			</div>
			<div className={styles.grid}>
				{expired?.map(game => {
					return <LottoCard key={game.id} {...game} />
				})}
			</div>
			<div className={styles.grid}>
				{complete?.map(game => {
					return <LottoCard key={game.id} {...game} />
				})}
			</div>
		</div>
	)
}