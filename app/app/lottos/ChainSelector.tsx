'use client';

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function ChainSelector() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [chainId, setChainId] = useState<string>();

	useEffect(() => {
		const supportedChains: string[] = ["0xaa36a7", "0x5", "0x1"];
		const selectChainId: string | null = searchParams.get("chainId");
		if (selectChainId) {
			if (supportedChains.includes(selectChainId)) {
				setChainId(selectChainId);
			} else {
				setChainId("0xaa36a7");
				router.push(pathname + '?' + createQueryString('chainId', "0xaa36a7"));
				alert(`Chain with id ${selectChainId} is unsupported\nDefaulting to Sepolia`);
			}
		} else {
			setChainId("0xaa36a7");
			router.push(pathname + '?' + createQueryString('chainId', "0xaa36a7"));
		}
	}, [])

	const handleChainChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setChainId(event.target.value);
		router.push(pathname + '?' + createQueryString('chainId', event.target.value));
	}

	const createQueryString = useCallback(
		(name: string, value: string) => {
			const params = new URLSearchParams(searchParams);
			params.set(name, value);
			return params.toString();
		},
		[searchParams],
	);

	return (
		<select value={chainId} onChange={handleChainChange}>
			<option value="0xaa36a7">Sepolia</option>
			<option value="0x5">Goerli</option>
			<option value="0x1">Mainnet😳</option>
		</select>
	)
}
