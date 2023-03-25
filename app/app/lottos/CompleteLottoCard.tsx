'use client';

import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { useChainId } from './layout';
import { FaEthereum } from "react-icons/fa";
import { utils, BigNumber } from "ethers";
import { Game } from './page';
import { getContractWithProvider } from "./contractHandler";

interface Props extends Game {
	refreshData: () => void;
}

const CompleteLottoCard = ({ id, capacity, ticketPrice, pool }: Props) => {
	const [winner, setWinner] = useState<string>("");

	const chainId = useChainId();
	
	useEffect(() => {
		const getWinner = async () => {
			const contract = await getContractWithProvider(chainId);
			if (contract) {
				const filter = contract.filters.Winner(id);
				const events = await contract.queryFilter(filter);
				setWinner('0x' + events[0].data.slice(26));
			}
		}
		 
		getWinner();
	}, []);

	const formatAddress = (address: string) => address.slice(0, 4) + '...' + address.slice(-4);

	return (
	  <div className={styles.card}>
		<div className={styles.completeTab}>
		  <span> Complete </span>
		  <span>{pool.length}/{capacity}</span>
		</div>
		<div className={styles.content}>
			<h2 className={styles.prize}>
				Prize: {utils.formatEther(BigNumber.from(ticketPrice).mul(capacity))}
				<span style={{ fontSize: 17 }}>
					<FaEthereum />
				</span>
			</h2>
			<div className={styles.price}>
				Ticket: {utils.formatEther(ticketPrice)}
				<span style={{ fontSize: 12 }}>
 					<FaEthereum />
 				</span>
			</div>
		</div>
		<div className={styles.winner}>Winner: {formatAddress(winner)}</div>
	  </div>
	)
}
export default CompleteLottoCard;

