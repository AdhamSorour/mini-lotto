'use client';

import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { Matic } from "@styled-icons/crypto"
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
			const filter = contract.filters.Winner(id);
			const events = await contract.queryFilter(filter);
			setWinner('0x' + events[0].data.slice(26));
		}

		getWinner();
	}, [id, chainId]);

	const formatAddress = (address: string) => address.slice(0, 4) + '...' + address.slice(-4);
	const addressUrl = (address: string) => {
		switch (chainId) {
			case "0x5": return "https://goerli.etherscan.io/address/" + address;
			case "0x89": return "https://polygonscan.com/address/" + address;
			case "0x13881": return "https://mumbai.polygonscan.com/address/" + address;
			default: return "https://sepolia.etherscan.io/address/" + address;
		}
	}

	const icon = (size:number) => {
		if (chainId === "0x5" || chainId === "0xaa36a7") return <FaEthereum size={size} />
		else return <Matic size={size} />
	}

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
					<span>{icon(20)}</span>
				</h2>
				<div className={styles.price}>
					Ticket: {utils.formatEther(ticketPrice)}
					<span>{icon(10)}</span>
				</div>
			</div>
			<div className={styles.winner}>
				Winner: 
				<a href={addressUrl(winner)} target="_blank" rel="noopener noreferrer">
					{formatAddress(winner)}
				</a>
			</div>
		</div>
	)
}
export default CompleteLottoCard;

