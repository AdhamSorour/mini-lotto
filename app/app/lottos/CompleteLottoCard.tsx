'use client';

import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { FaEthereum } from "react-icons/fa";
import { utils, BigNumber } from "ethers";
import { Game } from './page';
import { getContractWithProvider } from "./contractHandler";
import { useSearchParams } from "next/navigation";


const CompleteLottoCard = ({ id, capacity, ticketPrice, pool }: Game) => {
	const [winner, setWinner] = useState<string>("");

	const searchParams = useSearchParams();
	const chainId = searchParams.get("chainId")!;

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
	}, [id, chainId]);

	const formatAddress = (address: string) => address.slice(0, 4) + '...' + address.slice(-4);

	return (
		<div className={styles.card}>
			<div className={styles.completeTab}>
				<span> #{id} </span>
				<span> Complete </span>
				<span>{pool.length}/{capacity}</span>
			</div>
			<div className={styles.content}>
				<h2 className={styles.prize}>
					Prize: {utils.formatEther(BigNumber.from(ticketPrice).mul(capacity))}
					<span><FaEthereum /></span>
				</h2>
				<div className={styles.price}>
					Ticket: {utils.formatEther(ticketPrice)}
					<span><FaEthereum /></span>
				</div>
			</div>
			<div className={styles.winner}>Winner: {formatAddress(winner)}</div>
		</div>
	)
}
export default CompleteLottoCard;

