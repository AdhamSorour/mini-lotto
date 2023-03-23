'use client';

import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { FaEthereum } from "react-icons/fa";
import { utils, providers, Contract, BigNumber } from "ethers";
import { Game } from './page';
import detectEthereumProvider from '@metamask/detect-provider';
import deployments from '../../contract_deployments.json';
import artifact from '../../MiniLottoArtifact.json';

export async function getContract() : Promise<Contract | null> {
	const ethereum: any = await detectEthereumProvider();
	if (!ethereum) {
		alert("MetaMask Wallet Required");
		return null;
	}

	const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
	if (!accounts[0]) return null;

	const contract_address = (() => {switch(ethereum.networkVersion) {
			case "1": return deployments.proxy.mainnet;
			case "5": return deployments.proxy.goerli;
			case "11155111": return deployments.proxy.sepolia;
			default: return ""; 
		}
	})();
	if (contract_address === "") {
		alert("This network is not supported. Please select Sepolia, Goerli, or Mainnet");
		return null;
	}

	const signer = new providers.Web3Provider(ethereum).getSigner(); 
	return new Contract(contract_address, artifact.abi, signer);
}

enum Status {
	Active = "Active",
	Expired = "Expired",
	Complete = "Complete",
}

const LottoCard = ({ id, capacity, ticketPrice, pool, expiration, refunded }: Game) => {
	const [isMounted, setIsMounted] = useState(false);
	const [winner, setWinner] = useState("");
	const [numTickets, setNumTickets] = useState(1);
	const [remainingTime, setRemainingTime] = useState(expiration - Date.now()/1000); // in seconds

	const router = useRouter();
	
	const status = pool.length == capacity ? Status.Complete : 
		remainingTime > 0 || expiration == 0 ? Status.Active : Status.Expired;

  	const statusColor = () => {
		switch (status) {
			case Status.Active:		return "green";
			case Status.Expired:	return "gray";
			case Status.Complete:	return "";
		}
	};

	const expiryInfo = () => {
		if (!isMounted) return 'Loading...';
		switch(status) {
			case Status.Active:		
				if (expiration == 0) return `No Expiry`
				return `Expires in ${formatTime(remainingTime)}`;
			case Status.Expired:
				const expiry = new Date(expiration * 1000);
				return `Expired on ${expiry.toLocaleDateString()} ${expiry.toLocaleTimeString()}`;
			case Status.Complete: 	return ``;
		}
	}

	const getWinner = async () => {
		const contract = await getContract();
		if (contract) {
			const filter = contract.filters.Winner(id);
			const events = await contract.queryFilter(filter);
			setWinner('0x' + events[0].data.slice(26));
		}
	}
 	
	const formatAddress = (address: string) => address.slice(0, 4) + '...' + address.slice(-4);

	useEffect(() => {
		setIsMounted(true);

		if (status === Status.Active) {
			const intervalId = setInterval(() => {
				setRemainingTime(prevTime => {
					if (prevTime === 0) {
						clearInterval(intervalId);
						router.refresh();
					}
					return prevTime - 1;
				});
			}, 1000);

			return () => clearInterval(intervalId);
		} else if (status === Status.Complete) {
			getWinner();
		}
	}, []);


	const handleBuyTickets = async () => {
		const contract = await getContract();
		if (contract) {
			const tx = await contract.buyTickets(
				id, numTickets, { value: BigNumber.from(ticketPrice).mul(numTickets) }
			);
			await tx.wait();
			router.refresh();
		}
	};

	const handleRefund = async () => {
		const contract = await getContract();
		if (contract) {
			const tx = await contract.refund(id);
			await tx.wait();
			router.refresh();
		}
  	};

	const activeAction = 
		<span>
			<button onClick={handleBuyTickets}>Buy Ticket(s)</button>
			<button onClick={() => setNumTickets(num => Math.max(1, num - 1))}>-</button>
			<span>{numTickets}</span>
			<button onClick={() => setNumTickets(num => Math.min(capacity-pool.length, num + 1))}>+</button>
		</span>
	;
	const expiredAction = refunded? "Tickets Refunded" : <button onClick={handleRefund}>Refund</button>;
	const completeAction = <div className={styles.winner}>Winner: {formatAddress(winner)}</div>;

	const action = () => {
		switch(status) {
			case Status.Active: return activeAction;
			case Status.Expired: return expiredAction;
			case Status.Complete: return completeAction;
		}
	}

	const tabStyle = () => {
		switch(status) {
			case Status.Active: return styles.activeTab;
			case Status.Expired: return styles.expiredTab;
			case Status.Complete: return styles.completeTab;
		}
	}
  
	return (
	  <div className={styles.card}>
		<div className={tabStyle()}>
		  <span>{Status[status]}</span>
		  <span>{pool.length}/{capacity}</span>
		</div>
		<div className={styles.content}>
			<h2 className={styles.prize}>
				Prize: {capacity * parseFloat(utils.formatEther(ticketPrice))}
				<span className="text-2xl">
					<FaEthereum />
				</span>
			</h2>
			<div className={styles.price}>
				Ticket: {utils.formatEther(ticketPrice)}
				<span className="text-xl">
 					<FaEthereum />
 				</span>
			</div>
		</div>
		<div className={styles.expiry}>{expiryInfo()}</div>
		<div className={styles.actions}>{action()}</div>
	  </div>
	)
}
export default LottoCard;
 
function formatTime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600).toString().padStart(2,'0');
	const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2,'0');
	const secs = Math.floor(seconds % 60).toString().padStart(2,'0');
	return `${days}:${hours}:${minutes}:${secs}`;
}
