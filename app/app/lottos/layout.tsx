import ChainSelector from "./ChainSelector"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main>
      <ChainSelector/>
      {children}
    </main>
  )
}