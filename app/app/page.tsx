import { Inter } from 'next/font/google'
import styles from './page.module.css'
import Link from 'next/link'
import LottoLogo from './LottoLogo'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.center}>
        <LottoLogo width={250} height={250}/>
      </div>

      <div>
        <Link href="/lottos?chainId=0xaa36a7" className={styles.enter}>
          <h2 className={inter.className}>
            Enter <span> --&gt;</span>
          </h2>
        </Link>
      </div>
    </main>
  )
}
