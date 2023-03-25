'use client';

import styles from "./page.module.css";
import { FaEthereum } from "react-icons/fa";
import { utils, BigNumber } from "ethers";
import { Game } from './page';
import { getContractWithSigner } from "./contractHandler";
import { useRouter, useSearchParams } from "next/navigation";


const ExpiredLottoCard = ({ id, capacity, ticketPrice, pool, expiration, refunded }: Game) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const chainId = searchParams.get("chainId")!;

	const handleRefund = async () => {
		const contract = await getContractWithSigner(chainId);
		if (contract) {
			const tx = await contract.refund(id);
			await tx.wait();
			router.refresh();
		}
	};

	const expiry = new Date(expiration * 1000);
	const expiryInfo = `Expired on ${expiry.toLocaleDateString()} ${expiry.toLocaleTimeString()}`;

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
