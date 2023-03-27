'use client';

import AccountProvider from "./AccountProvider"
import ChainSelector from "./ChainSelector"
import styles from './page.module.css'
import LottoLogo from "../LottoLogo";
import { useState } from "react";
import CreateDialog from "./CreateDialog";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);

  const toggleCreateDialog = () => setIsCreateDialogOpen(prev => !prev);

  return (
    <main >
      <div className={styles.center}>
        <div className={styles.floatingLogo}>
          <LottoLogo width={150} height={150} onClick={toggleCreateDialog}/>
        </div>
        <div className={styles.chainSelector}>
          <ChainSelector/>
        </div>
        <div className={styles.verticalLine}></div>
        <AccountProvider>
          {children}
        </AccountProvider>
        {isCreateDialogOpen && <CreateDialog/>}
      </div>
    </main>
  )
}