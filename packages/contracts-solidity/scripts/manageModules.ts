import { ethers } from "hardhat";
import { getContractAddress } from "./lib/deployment";

// Modules registered in Registry. Factory is wired via control.setFactory(),
// not via Registry, so it is not part of this list.
const MODULE_NAMES = ["CONTROL", "FLOW", "IDENTITY", "MEMBERSHIP", "SENSE", "SIGNAL"] as const;
type ModuleName = typeof MODULE_NAMES[number];

async function getRegistryAddress(): Promise<string> {
  return getContractAddress("Registry");
}

function moduleId(name: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

export async function listModules() {
  const registryAddress = await getRegistryAddress();
  const registry = await ethers.getContractAt("Registry", registryAddress);

  console.log(`\n📋 Registry: ${registryAddress}`);
  console.log("─".repeat(60));

  for (const name of MODULE_NAMES) {
    const id = moduleId(name);
    try {
      const addr = await registry.getModule(id);
      const enabled = await registry.isModuleEnabled(id);
      const status = enabled ? "✅ enabled" : "❌ disabled";
      console.log(`  ${name.padEnd(12)} ${status}  ${addr}`);
    } catch {
      console.log(`  ${name.padEnd(12)} ⚠️  not registered`);
    }
  }
  console.log("");
}

export async function enableModule(name: string) {
  const upper = name.toUpperCase();
  if (!MODULE_NAMES.includes(upper as ModuleName)) {
    throw new Error(`Unknown module: ${name}. Valid: ${MODULE_NAMES.join(", ")}`);
  }

  const registryAddress = await getRegistryAddress();
  const registry = await ethers.getContractAt("Registry", registryAddress);
  const id = moduleId(upper);

  const enabled = await registry.isModuleEnabled(id);
  if (enabled) {
    console.log(`✅ ${upper} is already enabled`);
    return;
  }

  console.log(`🔧 Enabling ${upper}...`);
  const tx = await registry.enableModule(id);
  await tx.wait();
  console.log(`✅ ${upper} enabled`);
}

export async function disableModule(name: string) {
  const upper = name.toUpperCase();
  if (!MODULE_NAMES.includes(upper as ModuleName)) {
    throw new Error(`Unknown module: ${name}. Valid: ${MODULE_NAMES.join(", ")}`);
  }

  const registryAddress = await getRegistryAddress();
  const registry = await ethers.getContractAt("Registry", registryAddress);
  const id = moduleId(upper);

  const enabled = await registry.isModuleEnabled(id);
  if (!enabled) {
    console.log(`❌ ${upper} is already disabled`);
    return;
  }

  console.log(`🔧 Disabling ${upper}...`);
  const tx = await registry.disableModule(id);
  await tx.wait();
  console.log(`❌ ${upper} disabled`);
}

export async function enableAllModules() {
  const registryAddress = await getRegistryAddress();
  const registry = await ethers.getContractAt("Registry", registryAddress);

  console.log("🔧 Enabling all modules...");
  for (const name of MODULE_NAMES) {
    const id = moduleId(name);
    try {
      const isEnabled = await registry.isModuleEnabled(id);
      if (isEnabled) {
        console.log(`  ${name.padEnd(12)} already enabled`);
        continue;
      }
      const tx = await registry.enableModule(id);
      await tx.wait();
      console.log(`  ${name.padEnd(12)} ✅ enabled`);
    } catch (e: any) {
      console.log(`  ${name.padEnd(12)} ⚠️  skipped (${e.message?.slice(0, 60)})`);
    }
  }
  console.log("");
}

export async function disableAllModules() {
  const registryAddress = await getRegistryAddress();
  const registry = await ethers.getContractAt("Registry", registryAddress);

  console.log("🔧 Disabling all modules...");
  for (const name of MODULE_NAMES) {
    const id = moduleId(name);
    try {
      const isEnabled = await registry.isModuleEnabled(id);
      if (!isEnabled) {
        console.log(`  ${name.padEnd(12)} already disabled`);
        continue;
      }
      const tx = await registry.disableModule(id);
      await tx.wait();
      console.log(`  ${name.padEnd(12)} ❌ disabled`);
    } catch (e: any) {
      console.log(`  ${name.padEnd(12)} ⚠️  skipped (${e.message?.slice(0, 60)})`);
    }
  }
  console.log("");
}
