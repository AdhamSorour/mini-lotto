'use client';

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function ChainSelector() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [chainId, setChainId] = useState<string>();
	const [isTestnet, setIsTestnet] = useState<boolean>();

	const createQueryString = useCallback(
		(name: string, value: string) => {
			const params = new URLSearchParams(searchParams);
			params.set(name, value);
			return params.toString();
		},
		[searchParams],
	);

	useEffect(() => {
		const supportedChains: string[] = ["0xaa36a7", "0x5", "0x13881", "0x89"];
		const testnets: string[] = ["0xaa36a7", "0x5", "0x13881"];

		const selectChainId: string | null = searchParams.get("chainId");
		if (selectChainId) {
			if (supportedChains.includes(selectChainId)) {
				setChainId(selectChainId);
			} else {
				setChainId("0xaa36a7");
				router.push(pathname + '?' + createQueryString('chainId', "0xaa36a7"));
				alert(`Chain with id ${selectChainId} is not supported\nDefaulting to Sepolia`);
			}
			setIsTestnet(testnets.includes(selectChainId));
		} else {
			setChainId("0xaa36a7");
			setIsTestnet(true);
			router.push(pathname + '?' + createQueryString('chainId', "0xaa36a7"));
		}
	}, [pathname, searchParams, router, createQueryString])

	const handleChainChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setChainId(event.target.value);
		router.push(pathname + '?' + createQueryString('chainId', event.target.value));
	}

	const faucetUrl = () => {
		switch (chainId) {
			case "0x5": return "https://goerlifaucet.com";
			case "0x13881": return "https://mumbaifaucet.com";
			default: return "https://sepoliafaucet.com";
		}
	}

	return (
	<>
		<select value={chainId} onChange={handleChainChange}>
			<optgroup>
				<option value="0xaa36a7">Sepolia</option>
				<option value="0x5">Goerli</option>
				<option value="0x13881">Mumbai</option>
				<option value="0x89">Polygon 😳</option>
			</optgroup>
		</select>
		<br/><br/>
		{isTestnet && (
			<p>
				Need testnet tokens? Get them from the{" "}
				<a href={faucetUrl()} target="_blank" rel="noopener noreferrer">
					faucet
				</a>
			</p>
		)}
	</>
	)
}
