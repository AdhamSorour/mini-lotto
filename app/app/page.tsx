import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from './page.module.css'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.center}>
        <div className={styles.lottologo}>
          <Image src="/lotto.png" alt="minilotto_logo" width={250} height={250} priority />
        </div>
      </div>

      <div>
        <a href="/lottos" className={styles.card}>
          <h2 className={inter.className}>
            Enter <span> --&gt;</span>
          </h2>
        </a>
      </div>
    </main>
  )
}
