'use client';

import { useState } from 'react';
import { DateTime } from 'luxon';
import { utils } from 'ethers';
import { useChainId } from './layout';
import { getContractWithSigner } from './contractHandler';

export default function CreateLotto({ refreshData } : { refreshData: () => void }) {
	const [capacity, setCapacity] = useState<number>(10);
	const [ticketPrice, setTicketPrice] = useState<number>(0.1);
	const [numTickets, setNumTickets] = useState<number>(1);
	const [expirationEnabled, setExpirationEnabled] = useState<boolean>(false);
	const [expiration, setExpiration] = useState<number>(0);

	const chainId = useChainId();

	const create = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const contract = await getContractWithSigner(chainId);
		if (contract) {
			const ticketPriceInWei = utils.parseEther(ticketPrice.toString());
			const tx = await contract.createGame(
				capacity, ticketPriceInWei, expiration, numTickets,
				{ value: ticketPriceInWei.mul(numTickets) }
			);
			await tx.wait();
			refreshData();
		}
	}

	const handleCapacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(event.target.value);
		if (!isNaN(value)) setCapacity(value);
	};

	const handleTicketPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseFloat(event.target.value);
		if (!isNaN(value)) setTicketPrice(value);
	};

	const handleNumTicketsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(event.target.value);
		if (!isNaN(value)) setNumTickets(value);
	}

	const handleExpirationEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setExpirationEnabled(event.target.checked);
		if (!event.target.checked) setExpiration(0);
	};

	const handleExpirationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setExpiration(DateTime.fromISO(event.target.value).toSeconds());
	};

	return (
		<form onSubmit={create}>
			<div>
				Capacity:
				<input 
					type="number" 
					value={capacity} 
					onChange={handleCapacityChange} 
					min={2} 
					max={8000000000}
					onKeyDown={() => false}
					required 
				/>
			</div>
			<div>
				Ticket price:
				<input 
					type="number" 
					value={ticketPrice}
					onChange={handleTicketPriceChange}
					min={0.0001} 
					step={0.0001}
					required
				/>
			</div>
			<div>
				Tickets to buy:
				<input
					type="number"
					value={numTickets}
					onChange={handleNumTicketsChange}
					min={1}
					max={capacity}
					required
				/>
			</div>
			<div>
				<input 
					type="checkbox" 
					checked={expirationEnabled} 
					onChange={handleExpirationEnabledChange} 
				/>
				Expiration:
				{expirationEnabled && (
					<input 
						type="datetime-local"
						onChange={handleExpirationChange}
						min={DateTime.local().toISO().slice(0,16)}
						required
					/>
				)}
			</div>
			<button type="submit">Create lotto</button>
		</form>
	);
};
