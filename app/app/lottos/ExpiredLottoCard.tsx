'use client';

import styles from "./page.module.css";
import { FaEthereum } from "react-icons/fa";
import { utils, BigNumber } from "ethers";
import { Game } from './page';
import { getContractWithSigner } from "./contractHandler";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";


const ExpiredLottoCard = ({ id, capacity, ticketPrice, pool, expiration, refunded }: Game) => {
	const [expiryInfo, setExpiryInfo] = useState<string>("Expired on ...");

	const router = useRouter();
	const searchParams = useSearchParams();
	const chainId = searchParams.get("chainId")!;

	useEffect(() => {
		const expiry = new Date(expiration * 1000);
		setExpiryInfo(`Expired on ${expiry.toLocaleDateString()} ${expiry.toLocaleTimeString()}`);
	}, [expiration]);

	const handleRefund = async () => {
		const contract = await getContractWithSigner(chainId);
		if (contract) {
			const tx = await contract.refund(id);
			await tx.wait();
			router.refresh();
		}
	};

	return (
		<div className={styles.card}>
			<div className={styles.expiredTab}>
				<span> #{id} </span>
				<span> Expired </span>
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
			<div className={styles.expiry}>{expiryInfo}</div>
			<div className={styles.actions}>
				{refunded ? "Tickets Refunded" : <button onClick={handleRefund}>Refund</button>}
			</div>
		</div>
	)
}
export default ExpiredLottoCard;
