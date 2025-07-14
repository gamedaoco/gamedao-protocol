import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  GameDAORegistry,
  Control,
  Flow,
  Signal,
  Identity,
  SenseSimplified,
  Treasury,
  GameStaking,
  MockGameToken,
  MockUSDC
} from "../../typechain-types";

export interface TestSetup {
  registry: GameDAORegistry;
  control: Control;
  flow: Flow;
  signal: Signal;
  identity: Identity;
  senseSimplified: SenseSimplified;
  treasury: Treasury;
  gameStaking: GameStaking;
  gameToken: MockGameToken;
  usdc: MockUSDC;
  admin: SignerWithAddress;
  users: SignerWithAddress[];
}

export async function deployTestSetup(): Promise<TestSetup> {
  const [admin, ...users] = await ethers.getSigners();

  // Deploy Test Tokens
  const GameTokenFactory = await ethers.getContractFactory("MockGameToken");
  const gameToken = await GameTokenFactory.deploy();
  await gameToken.waitForDeployment();

  const USDCFactory = await ethers.getContractFactory("MockUSDC");
  const usdc = await USDCFactory.deploy();
  await usdc.waitForDeployment();

  // Deploy GameDAO Registry
  const GameDAORegistryFactory = await ethers.getContractFactory("GameDAORegistry");
  const registry = await GameDAORegistryFactory.deploy(admin.address);
  await registry.waitForDeployment();

  // Deploy Control Module
  const ControlFactory = await ethers.getContractFactory("Control");
  const control = await ControlFactory.deploy(await gameToken.getAddress());
  await control.waitForDeployment();

  // Deploy Flow Module
  const FlowFactory = await ethers.getContractFactory("Flow");
  const flow = await FlowFactory.deploy();
  await flow.waitForDeployment();

  // Deploy Signal Module
  const SignalFactory = await ethers.getContractFactory("Signal");
  const signal = await SignalFactory.deploy();
  await signal.waitForDeployment();

  // Deploy Identity Module
  const IdentityFactory = await ethers.getContractFactory("Identity");
  const identity = await IdentityFactory.deploy();
  await identity.waitForDeployment();

  // Deploy SenseSimplified Module
  const SenseSimplifiedFactory = await ethers.getContractFactory("SenseSimplified");
  const senseSimplified = await SenseSimplifiedFactory.deploy();
  await senseSimplified.waitForDeployment();

  // Deploy Treasury
  const TreasuryFactory = await ethers.getContractFactory("Treasury");
  const treasury = await TreasuryFactory.deploy(
    ethers.keccak256(ethers.toUtf8Bytes("TEST_ORG")), // organizationId
    await control.getAddress(), // controlModule
    admin.address // admin
  );
  await treasury.waitForDeployment();

  // Deploy GameStaking
  const GameStakingFactory = await ethers.getContractFactory("GameStaking");
  const gameStaking = await GameStakingFactory.deploy(
    await gameToken.getAddress(),
    await treasury.getAddress(),
    500 // 5% protocol fee share
  );
  await gameStaking.waitForDeployment();

  // Register and Enable Modules
  const CONTROL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CONTROL"));
  const FLOW_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FLOW"));
  const SIGNAL_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SIGNAL"));
  const IDENTITY_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("IDENTITY"));
  const SENSE_MODULE_ID = ethers.keccak256(ethers.toUtf8Bytes("SENSE"));

  await registry.registerModule(await control.getAddress());
  await registry.registerModule(await flow.getAddress());
  await registry.registerModule(await signal.getAddress());
  await registry.registerModule(await identity.getAddress());
  await registry.registerModule(await senseSimplified.getAddress());

  await registry.enableModule(CONTROL_MODULE_ID);
  await registry.enableModule(FLOW_MODULE_ID);
  await registry.enableModule(SIGNAL_MODULE_ID);
  await registry.enableModule(IDENTITY_MODULE_ID);
  await registry.enableModule(SENSE_MODULE_ID);

  // Initialize modules with registry
  await control.initialize(await registry.getAddress());
  await flow.initialize(await registry.getAddress());
  await signal.initialize(await registry.getAddress());
  await identity.initialize(await registry.getAddress());
  await senseSimplified.initialize(await registry.getAddress());

  return {
    registry,
    control,
    flow,
    signal,
    identity,
    senseSimplified,
    treasury,
    gameStaking,
    gameToken,
    usdc,
    admin,
    users
  };
}

export const MODULE_IDS = {
  CONTROL: ethers.keccak256(ethers.toUtf8Bytes("CONTROL")),
  FLOW: ethers.keccak256(ethers.toUtf8Bytes("FLOW")),
  SIGNAL: ethers.keccak256(ethers.toUtf8Bytes("SIGNAL")),
  IDENTITY: ethers.keccak256(ethers.toUtf8Bytes("IDENTITY")),
  SENSE: ethers.keccak256(ethers.toUtf8Bytes("SENSE"))
};

export async function createTestOrganization(
  control: Control,
  creator: SignerWithAddress,
  name: string = "Test DAO"
): Promise<string> {
  const tx = await control.connect(creator).createOrganization(
    name,
    "ipfs://test-metadata",
    0, // Individual
    0, // Open access
    0, // No fees
    100, // Member limit
    0, // No membership fee
    0  // No GAME stake required
  );

  const receipt = await tx.wait();
  const event = receipt?.logs.find(log => {
    try {
      const parsed = control.interface.parseLog(log as any);
      return parsed?.name === "OrganizationCreated";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = control.interface.parseLog(event as any);
    return parsed?.args.orgId;
  }

  throw new Error("Organization creation failed");
}

export async function createTestProfile(
  identity: Identity,
  user: SignerWithAddress,
  organizationId: string,
  metadata: string = "ipfs://test-profile"
): Promise<string> {
  const tx = await identity.connect(user).createProfile(
    organizationId,
    metadata
  );

  const receipt = await tx.wait();
  const event = receipt?.logs.find(log => {
    try {
      const parsed = identity.interface.parseLog(log as any);
      return parsed?.name === "ProfileCreated";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = identity.interface.parseLog(event as any);
    return parsed?.args.profileId;
  }

  throw new Error("Profile creation failed");
}
