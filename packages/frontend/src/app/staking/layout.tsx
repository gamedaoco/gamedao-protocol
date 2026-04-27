// Staking is a standalone contract, not a Registry-managed module.
// No ModuleGate — page is available whenever the chain is reachable.
export default function StakingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
