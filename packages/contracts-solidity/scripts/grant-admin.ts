import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const arg = process.argv.find(a => a.startsWith("--address="))?.split("=")[1] || "";
  const env = process.env.ADDRESS || process.env.ADDR || process.env.ADMIN || "";
  const address = (arg || env).trim();

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Provide admin address via --address=0x... or ADDRESS env var");
  }

  let registry = process.env.REGISTRY || "";
  if (!registry) {
    const candidates = [
      path.join(__dirname, "../deployment-addresses.json"),
      path.resolve(process.cwd(), "packages/contracts-solidity/deployment-addresses.json"),
      path.resolve(process.cwd(), "data/contracts/deployment-addresses.json"),
    ];
    let file = '';
    for (const p of candidates) { if (fs.existsSync(p)) { file = p; break; } }
    if (!file) throw new Error("deployment-addresses.json not found; pass REGISTRY env or --registry");
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    registry = json?.contracts?.Registry || json?.Registry;
    if (!registry) throw new Error("Registry address missing in deployment-addresses.json");
  }

  console.log("🔗 Registry:", registry);
  console.log("👤 Admin to grant:", address);

  const net = await ethers.provider.getNetwork();
  console.log("🌐 ChainId:", Number(net.chainId));

  const reg = await ethers.getContractAt("Registry", registry);
  const ADMIN_ROLE = await reg.ADMIN_ROLE();
  const MODULE_MANAGER_ROLE = await reg.MODULE_MANAGER_ROLE();

  const hasAdmin = await reg.hasRole(ADMIN_ROLE, address);
  if (!hasAdmin) {
    const tx = await reg.grantRole(ADMIN_ROLE, address);
    await tx.wait();
    console.log("✅ ADMIN_ROLE granted");
  } else {
    console.log("ℹ️ Already has ADMIN_ROLE");
  }

  const hasMgr = await reg.hasRole(MODULE_MANAGER_ROLE, address);
  if (!hasMgr) {
    const tx2 = await reg.grantRole(MODULE_MANAGER_ROLE, address);
    await tx2.wait();
    console.log("✅ MODULE_MANAGER_ROLE granted");
  } else {
    console.log("ℹ️ Already has MODULE_MANAGER_ROLE");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


