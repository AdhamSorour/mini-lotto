'use client';

import { useState } from "react";
import { ChainIdContext } from "./ChainIdProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [chainId, setChainId] = useState<string>("0xaa36a7");

  return (
    <main>
      	<ChainIdContext.Provider value={chainId}>
          <select value={chainId} onChange={(e) => setChainId(e.target.value)}>
            <option value="0xaa36a7">Sepolia</option>
            <option value="0x5">Goerli</option>
            <option value="0x1">Mainnet😳</option>
          </select>
          {children}
        </ChainIdContext.Provider>
    </main>
  )
}