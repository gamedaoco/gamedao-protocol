import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🧪 Testing Profile Creation (Individual & Organization)");
  console.log("====================================================");

  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();

  // Load deployment addresses
  const addresses = JSON.parse(fs.readFileSync("./deployment-addresses.json", "utf8"));

  // Connect to contracts
  const control = await ethers.getContractAt("Control", addresses.control);
  const identity = await ethers.getContractAt("Identity", addresses.identity);
  const gameToken = await ethers.getContractAt("MockGameToken", addresses.gameToken);

  console.log("📋 Connected to contracts");
  console.log(`👤 User1: ${user1.address}`);
  console.log(`👤 User2: ${user2.address}`);
  console.log("");

  // Test 1: Create individual profile (no organization)
  console.log("🧪 Test 1: Creating individual profile...");
  try {
    const tx = await identity.connect(user1).createProfile(
      "0x0000000000000000", // Zero organization ID for individual
      JSON.stringify({
        username: "alice_individual",
        bio: "Independent gamer and developer",
        avatar: "👩‍💻"
      })
    );

    const receipt = await tx.wait();
    const event = receipt?.logs.find(log => {
      try {
        const parsed = identity.interface.parseLog(log);
        return parsed?.name === "ProfileCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = identity.interface.parseLog(event);
      const profileId = parsedEvent?.args.profileId;
      console.log(`✅ Individual profile created: ${profileId}`);

      // Verify profile
      const profile = await identity.getProfile(profileId);
      console.log(`   Owner: ${profile.owner}`);
      console.log(`   Organization: ${profile.organizationId}`);
      console.log(`   Active: ${profile.active}`);
    } else {
      console.log("❌ No ProfileCreated event found");
    }
  } catch (error: any) {
    console.log(`❌ Individual profile creation failed: ${error.message}`);
  }
  console.log("");

  // Test 2: Create organization with zero staking requirement
  console.log("🧪 Test 2: Creating organization with zero staking...");
  try {
    const tx = await control.connect(user2).createOrganization(
      "Test Gaming DAO",
      "A test organization for profile testing",
      0, // OrgType.Individual
      0, // AccessModel.Open
      0, // FeeModel.NoFees
      100, // memberLimit
      0, // membershipFee
      0  // gameStakeRequired (zero for testing)
    );

    const receipt = await tx.wait();
    const event = receipt?.logs.find(log => {
      try {
        const parsed = control.interface.parseLog(log);
        return parsed?.name === "OrganizationCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = control.interface.parseLog(event);
      const orgId = parsedEvent?.args.id;
      console.log(`✅ Organization created: ${orgId}`);

      // Test 3: Create profile for organization
      console.log("🧪 Test 3: Creating organization profile...");
      try {
        const profileTx = await identity.connect(user2).createProfile(
          orgId,
          JSON.stringify({
            username: "dao_member",
            bio: "Member of Test Gaming DAO",
            avatar: "🎮"
          })
        );

        const profileReceipt = await profileTx.wait();
        const profileEvent = profileReceipt?.logs.find(log => {
          try {
            const parsed = identity.interface.parseLog(log);
            return parsed?.name === "ProfileCreated";
          } catch {
            return false;
          }
        });

        if (profileEvent) {
          const parsedProfileEvent = identity.interface.parseLog(profileEvent);
          const profileId = parsedProfileEvent?.args.profileId;
          console.log(`✅ Organization profile created: ${profileId}`);

          // Verify profile
          const profile = await identity.getProfile(profileId);
          console.log(`   Owner: ${profile.owner}`);
          console.log(`   Organization: ${profile.organizationId}`);
          console.log(`   Active: ${profile.active}`);
        } else {
          console.log("❌ No ProfileCreated event found for organization profile");
        }
      } catch (error: any) {
        console.log(`❌ Organization profile creation failed: ${error.message}`);
      }
    } else {
      console.log("❌ No OrganizationCreated event found");
    }
  } catch (error: any) {
    console.log(`❌ Organization creation failed: ${error.message}`);
  }
  console.log("");

  // Test 4: Verify profile counts
  console.log("🧪 Test 4: Checking profile counts...");
  try {
    const profileCount = await identity.getProfileCount();
    console.log(`✅ Total profiles created: ${profileCount}`);
  } catch (error: any) {
    console.log(`❌ Failed to get profile count: ${error.message}`);
  }

  console.log("");
  console.log("🎉 Profile creation tests completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
