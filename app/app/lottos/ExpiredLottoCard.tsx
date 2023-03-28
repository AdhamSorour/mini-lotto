'use client';

import styles from "./page.module.css";
import { FaEthereum } from "react-icons/fa";
import { Matic } from "@styled-icons/crypto"
import { utils, BigNumber } from "ethers";
import { Game } from './page';
import { getContractWithSigner } from "./contractHandler";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "./AccountProvider";


const ExpiredLottoCard = ({ id, capacity, ticketPrice, pool, expiration }: Game) => {
	const [expiryInfo, setExpiryInfo] = useState<string>("Expired on ...");
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const router = useRouter();
	const searchParams = useSearchParams();
	const chainId = searchParams.get("chainId")!;

	const account = useAccount();

	useEffect(() => {
		const expiry = new Date(expiration * 1000);
		setExpiryInfo(`Expired on ${expiry.toLocaleDateString()} ${expiry.toLocaleTimeString()}`);
	}, [expiration]);

	const distributePrize = async () => {
		setIsLoading(true);
		const contract = await getContractWithSigner(chainId, account);
		if (contract) {
			try {
				const tx = await contract.distributePrize(id);
				await tx.wait();
				router.refresh();
			} catch (error: any) {
				error = error.error || error.data;
				if (error?.code === -32000) {
					alert("you poor");
				} else {
					alert("problem with transaction");
				}
			}
		}
		setIsLoading(false);
	};

	const icon = (size:number) => {
		if (chainId === "0x5" || chainId === "0xaa36a7") return <FaEthereum size={size} />
		else return <Matic size={size} />
	}

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
					<span>{icon(20)}</span>
				</h2>
				<div className={styles.price}>
					Ticket: {utils.formatEther(ticketPrice)}
					<span>{icon(10)}</span>
				</div>
			</div>
			<div className={styles.expiry}>{expiryInfo}</div>
			<div className={styles.actions}>
				<button onClick={distributePrize} disabled={isLoading}>
					{isLoading ? <i className={styles.spinner}></i> : "Distribute Prize"}
				</button>
			</div>
		</div>
	)
}
export default ExpiredLottoCard;
