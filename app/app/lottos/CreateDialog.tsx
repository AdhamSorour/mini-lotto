'use client';

import { useState } from 'react';
import { DateTime } from 'luxon';
import { utils } from 'ethers';
import { getContractWithSigner } from './contractHandler';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from './AccountProvider';
import styles from './page.module.css';


export default function CreateDialog() {
	const [capacity, setCapacity] = useState<number>(10);
	const [ticketPrice, setTicketPrice] = useState<number>(0.1);
	const [numTickets, setNumTickets] = useState<number>(1);
	const [expirationEnabled, setExpirationEnabled] = useState<boolean>(false);
	const [expiration, setExpiration] = useState<number>(0);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const router = useRouter();
	const searchParams = useSearchParams();
	const chainId = searchParams.get("chainId")!;

	const account = useAccount();

	const create = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);

		const contract = await getContractWithSigner(chainId, account);
		if (contract) {
			const ticketPriceInWei = utils.parseEther(ticketPrice.toString());
			try {
				const tx = await contract.createGame(
					capacity, ticketPriceInWei, expiration, numTickets,
					{ value: ticketPriceInWei.mul(numTickets) }
				);
				await tx.wait();
				router.refresh();
			} catch (error: any) {
				if (error.code === "INSUFFICIENT_FUNDS") {
					alert("you poor");
					console.log(error);
				}
			}
		}
		setIsLoading(false);
	}

	const handleCapacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const result = event.target.value.replace(/\D/g, '');
		setCapacity(parseInt(result));
	};

	const handleTicketPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const result = event.target.value.replace(/[^0-9.]/g, '');
		setTicketPrice(parseFloat(result));
	};

	const handleNumTicketsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const result = event.target.value.replace(/\D/g, '');
		setNumTickets(parseInt(result));
	}

	const handleExpirationEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setExpirationEnabled(event.target.checked);
		if (!event.target.checked) setExpiration(0);
	};

	const handleExpirationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setExpiration(DateTime.fromISO(event.target.value).toSeconds());
	};

	return (
		<div className={styles.modal}>
			<div className={styles.modalSolidBackground}></div>
			<div className={styles.modalContent}>
				<form onSubmit={create}>
					<div className={styles.formElement}>
						<label htmlFor="capacity">Capacity:</label>
						<input
							className={styles.inputField}
							type="number"
							id="capacity"
							value={capacity}
							onChange={handleCapacityChange}
							min={2}
							max={8000000000}
							required
						/>
					</div>
					<div className={styles.formElement}>
						<label htmlFor="ticketPrice">Ticket price:</label>
						<input
							className={styles.inputField}
							type="number"
							id="ticketPrice"
							value={ticketPrice}
							onChange={handleTicketPriceChange}
							min={0.0001}
							step={0.0001}
							required
						/>
					</div>
					<div className={styles.formElement}>
						<label htmlFor="numTickets">Tickets to buy:</label>
						<input
							className={styles.inputField}
							type="number"
							id="numTickets"
							value={numTickets}
							onChange={handleNumTicketsChange}
							min={1}
							max={capacity}
							required
						/>
					</div>
					<div className={styles.formElement}>
						<div className={styles.checkboxContainer}>
							<input
								type="checkbox"
								id="expirationEnabled"
								checked={expirationEnabled}
								onChange={handleExpirationEnabledChange}
							/>
							<label htmlFor="expirationEnabled">Expiration:</label>
						</div>
						<input
							className={styles.inputField}
							type="datetime-local"
							id="expiration"
							onChange={handleExpirationChange}
							min={DateTime.local().toISO().slice(0, 16)}
							disabled={!expirationEnabled}
							required
						/>
					</div>
					<div className={styles.actions}>
						<button style={{marginTop: 20}} type="submit" disabled={isLoading}>
							{isLoading ? <i className={styles.spinner}></i> : `Create Lotto`}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
} 