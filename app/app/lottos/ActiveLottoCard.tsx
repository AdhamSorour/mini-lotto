'use client';

import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { FaEthereum } from "react-icons/fa";
import { Matic } from "@styled-icons/crypto"
import { utils, BigNumber } from "ethers";
import { Game } from './page';
import { getContractWithSigner } from "./contractHandler";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "./AccountProvider";


const ActiveLottoCard = ({ id, capacity, ticketPrice, pool, expiration }: Game) => {
	const [numTickets, setNumTickets] = useState<number>(1);
	const [expiryInfo, setExpiryInfo] = useState<string>("Expires in ...");
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const router = useRouter();
	const searchParams = useSearchParams();
	const chainId = searchParams.get("chainId")!;

	const account = useAccount();

	useEffect(() => {
		if (expiration === 0) {
			setExpiryInfo(`No Expiry`);
			return;
		}

		const intervalId = setInterval(() => {
			const remainingTime = expiration - (Date.now() / 1000);
			setExpiryInfo(`Expires in ${formatTime(remainingTime)}`);
			if (remainingTime <= 0) {
				clearInterval(intervalId);
				router.refresh();
			}
		}, 1000);

		return () => clearInterval(intervalId);
	}, [expiration, router]);

	const handleBuyTickets = async () => {
		setIsLoading(true);
		const contract = await getContractWithSigner(chainId, account);
		if (contract) {
			try {
				const tx = await contract.buyTickets(
					id, numTickets, { value: BigNumber.from(ticketPrice).mul(numTickets) }
				);
				await tx.wait();
				router.refresh();
			} catch (error: any) {
				error = error.error || error.data;
				if (error && error.code === -32000) {
					alert("you poor");
				} else {
					alert("problem with transaction");
				}
			}
		}
		setIsLoading(false);
	};

	function formatTime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		if (days > 0) {
			return `${days} days`;
		}
		const hours = Math.floor((seconds % 86400) / 3600).toString().padStart(2, '0');
		const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
		const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
		return `${hours}:${minutes}:${secs}`;
	}

	const icon = (size:number) => {
		if (chainId === "0x5" || chainId === "0xaa36a7") return <FaEthereum size={size} />
		else return <Matic size={size} />
	}

	return (
		<div className={styles.card}>
			<div className={styles.activeTab}>
				<span> #{id} </span>
				<span> Active </span>
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
			<div className={styles.expiry}>{expiryInfo}</div>
			<div className={styles.actions}>
				<span>
					<button onClick={() => setNumTickets(num => Math.max(1, num - 1))}>-</button>
					<button onClick={handleBuyTickets} disabled={isLoading}>
						{isLoading ? <i className={styles.spinner}></i> : `Buy ${numTickets} Ticket(s)`}
					</button>
					<button onClick={() => setNumTickets(num => Math.min(capacity - pool.length, num + 1))}>+</button>
				</span>
			</div>
		</div>
	)
}
export default ActiveLottoCard;