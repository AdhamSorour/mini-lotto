'use client';

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function ChainSelector() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [chainId, setChainId] = useState<string>();

	useEffect(() => {
		const selectChainId = searchParams.get("chainId");
		if (selectChainId) {
			setChainId(selectChainId);
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
