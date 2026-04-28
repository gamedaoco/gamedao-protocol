import { ethers } from "hardhat";
import { getContractAddress } from "./lib/deployment";

export async function grantProtocolAdmin(account: string) {
  if (!ethers.isAddress(account)) {
    throw new Error(`Invalid address: ${account}`);
  }

  const registryAddress = await getContractAddress("Registry");
  const registry = await ethers.getContractAt("Registry", registryAddress);

  const ADMIN_ROLE = await registry.ADMIN_ROLE();
  const MODULE_MANAGER_ROLE = await registry.MODULE_MANAGER_ROLE();
  const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();

  console.log(`\n🔐 Granting protocol admin roles to ${account}`);
  console.log(`📋 Registry: ${registryAddress}`);
  console.log("─".repeat(60));

  const roles = [
    { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE },
    { name: "ADMIN_ROLE", hash: ADMIN_ROLE },
    { name: "MODULE_MANAGER_ROLE", hash: MODULE_MANAGER_ROLE },
  ];

  for (const { name, hash } of roles) {
    const hasIt = await registry.hasRole(hash, account);
    if (hasIt) {
      console.log(`  ${name.padEnd(22)} already granted`);
      continue;
    }
    const tx = await registry.grantRole(hash, account);
    await tx.wait();
    console.log(`  ${name.padEnd(22)} ✅ granted`);
  }

  console.log(`\n✅ ${account} is now a protocol admin\n`);
}
