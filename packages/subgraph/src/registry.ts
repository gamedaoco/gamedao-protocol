import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  ModuleRegistered,
  ModuleEnabled,
  ModuleDisabled,
  ModuleUpgraded
} from "../generated/GameDAORegistry/GameDAORegistry"
import {
  Module,
  ModuleRegistration,
  ModuleUpgrade,
  GlobalStats
} from "../generated/schema"

export function handleModuleRegistered(event: ModuleRegistered): void {
  let moduleId = event.params.name
  let module = Module.load(moduleId)

  if (module == null) {
    module = new Module(moduleId)
    module.version = BigInt.fromI32(1)
    module.registeredAt = event.block.timestamp
  }

  module.address = event.params.implementation
  module.admin = event.params.admin
  module.enabled = true
  module.updatedAt = event.block.timestamp

  module.save()

  // Create registration record
  let registrationId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let registration = new ModuleRegistration(registrationId)
  registration.module = moduleId
  registration.address = event.params.implementation
  registration.admin = event.params.admin
  registration.timestamp = event.block.timestamp
  registration.blockNumber = event.block.number
  registration.transactionHash = event.transaction.hash

  registration.save()

  // Update global stats
  updateGlobalStats()
}

export function handleModuleEnabled(event: ModuleEnabled): void {
  let moduleId = event.params.name
  let module = Module.load(moduleId)

  if (module != null) {
    module.enabled = true
    module.updatedAt = event.block.timestamp
    module.save()
  }

  updateGlobalStats()
}

export function handleModuleDisabled(event: ModuleDisabled): void {
  let moduleId = event.params.name
  let module = Module.load(moduleId)

  if (module != null) {
    module.enabled = false
    module.updatedAt = event.block.timestamp
    module.save()
  }

  updateGlobalStats()
}

export function handleModuleUpgraded(event: ModuleUpgraded): void {
  let moduleId = event.params.name
  let module = Module.load(moduleId)

  if (module != null) {
    let oldAddress = module.address
    module.address = event.params.newImplementation
    module.version = module.version.plus(BigInt.fromI32(1))
    module.updatedAt = event.block.timestamp
    module.save()

    // Create upgrade record
    let upgradeId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    let upgrade = new ModuleUpgrade(upgradeId)
    upgrade.module = moduleId
    upgrade.oldAddress = oldAddress
    upgrade.newAddress = event.params.newImplementation
    upgrade.timestamp = event.block.timestamp
    upgrade.blockNumber = event.block.number
    upgrade.transactionHash = event.transaction.hash

    upgrade.save()
  }
}

function updateGlobalStats(): void {
  let stats = GlobalStats.load("global")
  if (stats == null) {
    stats = new GlobalStats("global")
    stats.totalModules = BigInt.fromI32(0)
    stats.activeModules = BigInt.fromI32(0)
    stats.totalOrganizations = BigInt.fromI32(0)
    stats.activeOrganizations = BigInt.fromI32(0)
    stats.totalMembers = BigInt.fromI32(0)
    stats.totalCampaigns = BigInt.fromI32(0)
    stats.activeCampaigns = BigInt.fromI32(0)
    stats.totalRaised = BigInt.fromI32(0).toBigDecimal()
    stats.totalProposals = BigInt.fromI32(0)
    stats.activeProposals = BigInt.fromI32(0)
    stats.totalVotes = BigInt.fromI32(0)
    stats.totalProfiles = BigInt.fromI32(0)
    stats.verifiedProfiles = BigInt.fromI32(0)
    stats.totalAchievements = BigInt.fromI32(0)
  }

  // Count total and active modules
  // Note: In a real implementation, you'd query all modules
  // For now, we'll increment counters
  stats.totalModules = stats.totalModules.plus(BigInt.fromI32(1))
  stats.activeModules = stats.activeModules.plus(BigInt.fromI32(1))
  stats.updatedAt = BigInt.fromI32(0) // Will be set by block timestamp

  stats.save()
}
