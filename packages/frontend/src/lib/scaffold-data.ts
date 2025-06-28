// Utility to load scaffolded test data for development
export interface ScaffoldUser {
  address: string
  name: string
  role: string
  avatar: string
}

export interface ScaffoldDAO {
  id: string
  name: string
  description: string
  members: string[]
  treasury: string
  creator: string
}

export interface ScaffoldCampaign {
  id: string
  title: string
  daoId: string
  daoName: string
  target: string
  creator: string
}

export interface ScaffoldProposal {
  id: string
  title: string
  daoId: string
  daoName: string
  proposer: string
}

export interface ScaffoldData {
  users: ScaffoldUser[]
  daos: ScaffoldDAO[]
  campaigns: ScaffoldCampaign[]
  proposals: ScaffoldProposal[]
  contracts: {
    registry: string
    control: string
    flow: string
    signal: string
  }
  timestamp: string
}

// Load scaffolded data (in development, this would be from a local file or API)
export function getScaffoldData(): ScaffoldData | null {
  // In development, you would load this from the generated scaffold-output.json
  // For now, return mock data structure

  if (typeof window === 'undefined') return null

  // Check if we have scaffolded data in localStorage (for demo purposes)
  const stored = localStorage.getItem('gamedao-scaffold-data')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  return null
}

// Helper functions to work with scaffolded data
export function getUserProfile(address: string, scaffoldData?: ScaffoldData): ScaffoldUser | null {
  const data = scaffoldData || getScaffoldData()
  if (!data) return null

  return data.users.find(user => user.address.toLowerCase() === address.toLowerCase()) || null
}

export function getUserDAOs(address: string, scaffoldData?: ScaffoldData): ScaffoldDAO[] {
  const data = scaffoldData || getScaffoldData()
  if (!data) return []

  return data.daos.filter(dao =>
    dao.members.some(member => member.toLowerCase() === address.toLowerCase())
  )
}

export function getUserCampaigns(address: string, scaffoldData?: ScaffoldData): ScaffoldCampaign[] {
  const data = scaffoldData || getScaffoldData()
  if (!data) return []

  return data.campaigns.filter(campaign =>
    campaign.creator.toLowerCase() === address.toLowerCase()
  )
}

export function getUserProposals(address: string, scaffoldData?: ScaffoldData): ScaffoldProposal[] {
  const data = scaffoldData || getScaffoldData()
  if (!data) return []

  return data.proposals.filter(proposal =>
    proposal.proposer.toLowerCase() === address.toLowerCase()
  )
}

export function getDAOMembers(daoId: string, scaffoldData?: ScaffoldData): ScaffoldUser[] {
  const data = scaffoldData || getScaffoldData()
  if (!data) return []

  const dao = data.daos.find(d => d.id === daoId)
  if (!dao) return []

  return data.users.filter(user =>
    dao.members.some(member => member.toLowerCase() === user.address.toLowerCase())
  )
}

export function getDAOCampaigns(daoId: string, scaffoldData?: ScaffoldData): ScaffoldCampaign[] {
  const data = scaffoldData || getScaffoldData()
  if (!data) return []

  return data.campaigns.filter(campaign => campaign.daoId === daoId)
}

export function getDAOProposals(daoId: string, scaffoldData?: ScaffoldData): ScaffoldProposal[] {
  const data = scaffoldData || getScaffoldData()
  if (!data) return []

  return data.proposals.filter(proposal => proposal.daoId === daoId)
}

// Check if a user is a member of a specific DAO
export function isDAOMember(daoId: string, userAddress: string, scaffoldData?: ScaffoldData): boolean {
  const data = scaffoldData || getScaffoldData()
  if (!data || !userAddress) return false

  const dao = data.daos.find(d => d.id === daoId)
  if (!dao) return false

  return dao.members.some(member => member.toLowerCase() === userAddress.toLowerCase())
}

// Development helper to load scaffold data from a file (would be called during development setup)
export function loadScaffoldDataFromFile(data: ScaffoldData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gamedao-scaffold-data', JSON.stringify(data))
  }
}

// Clear scaffolded data
export function clearScaffoldData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gamedao-scaffold-data')
  }
}
