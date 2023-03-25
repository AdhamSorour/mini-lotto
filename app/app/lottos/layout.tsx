import AccountProvider from "./AccountProvider"
import ChainSelector from "./ChainSelector"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main>
      <ChainSelector/>
      <AccountProvider>
        {children}
      </AccountProvider>
    </main>
  )
}