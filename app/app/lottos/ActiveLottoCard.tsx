'use client';

import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { useChainId } from './layout';
import { FaEthereum } from "react-icons/fa";
import { utils, BigNumber } from "ethers";
import { Game } from './page';
import { getContractWithSigner } from "./contractHandler";

interface Props extends Game {
	refreshData: () => void;
}

const ActiveLottoCard = ({ id, capacity, ticketPrice, pool, expiration, refreshData }: Props) => {
	const [numTickets, setNumTickets] = useState<number>(1);
	const [remainingTime, setRemainingTime] = useState<number>(expiration - (Date.now()/1000)); // in seconds

	const chainId = useChainId();
 	
	useEffect(() => {
		const intervalId = setInterval(() => {
			const newRemainingTime = expiration - (Date.now()/1000);
			setRemainingTime(newRemainingTime);
			if (newRemainingTime <= 0) {
				clearInterval(intervalId);
				refreshData();
			}
		}, 1000);

		return () => clearInterval(intervalId);
	}, []);

	const handleBuyTickets = async () => {
		const contract = await getContractWithSigner(chainId);
		if (contract) {
			const tx = await contract.buyTickets(
				id, numTickets, { value: BigNumber.from(ticketPrice).mul(numTickets) }
			);
			await tx.wait();
			refreshData();
		}
	};

	function formatTime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600).toString().padStart(2,'0');
		const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2,'0');
		const secs = Math.floor(seconds % 60).toString().padStart(2,'0');
		return `${days}:${hours}:${minutes}:${secs}`;
	}	

	return (
	  <div className={styles.card}>
		<div className={styles.activeTab}>
		  <span> Active </span>
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
		<div className={styles.expiry}>
			{expiration === 0? `No Expiry` : `Expires in ${formatTime(remainingTime)}`}
		</div>
		<div className={styles.actions}>
			<span>
				<button onClick={handleBuyTickets}>Buy Ticket(s)</button>
				<button onClick={() => setNumTickets(num => Math.max(1, num - 1))}>-</button>
				<span>{numTickets}</span>
				<button onClick={() => setNumTickets(num => Math.min(capacity-pool.length, num + 1))}>+</button>
			</span>
		</div>
	  </div>
	)
}
export default ActiveLottoCard;