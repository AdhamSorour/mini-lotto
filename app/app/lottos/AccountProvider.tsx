'use client';

import { createContext, useContext, useEffect, useState } from "react";
import detectEthereumProvider from '@metamask/detect-provider';

const AccountContext = createContext<string | null>(null);

export const useAccount = () => {
	return useContext(AccountContext);
}

export default function AccountProvider({
	children,
}: {
	children: React.ReactNode
}) {
    const [account, setAccount] = useState<string | null>(null);

	useEffect(() => {
		const setupListeners = async () => {
			const ethereum: any = await detectEthereumProvider();

			ethereum?.request({ method: 'eth_accounts' }).then((accounts:string[]) => {
				setAccount(accounts[0]);
			});
			ethereum?.on('accountsChanged', (accounts: string[]) => {
				setAccount(accounts[0]);
			});
		}
		
		setupListeners();
	}, []);

	return (
		<AccountContext.Provider value={account}>
			{children}
		</AccountContext.Provider>
	);
}