import { ethers } from "hardhat";
import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
interface ProfileConfig {
  userCount: number;
  organizationCount: number;
  campaignCount: number;
  proposalCount: number;
  interactionMultiplier: number;
}

// User archetypes for gaming industry
const USER_ARCHETYPES = [
  { role: "Game Developer", interests: ["Programming", "Game Design", "Unity"], avatar: "👩‍💻" },
  { role: "Artist", interests: ["3D Modeling", "Concept Art", "Animation"], avatar: "🎨" },
  { role: "Producer", interests: ["Project Management", "Publishing", "Marketing"], avatar: "📊" },
  { role: "Designer", interests: ["UX/UI", "Level Design", "Mechanics"], avatar: "🎯" },
  { role: "Community Manager", interests: ["Social Media", "Events", "Engagement"], avatar: "🌐" },
  { role: "Streamer", interests: ["Content Creation", "Broadcasting", "Gaming"], avatar: "📹" },
  { role: "Esports Player", interests: ["Competitive Gaming", "Training", "Tournaments"], avatar: "⚔️" },
  { role: "Investor", interests: ["Funding", "Strategy", "Growth"], avatar: "💰" },
  { role: "Blockchain Developer", interests: ["Smart Contracts", "DeFi", "Web3"], avatar: "⛓️" },
  { role: "Music Composer", interests: ["Audio Design", "Soundtracks", "Interactive Music"], avatar: "🎵" },
];

// Organization types
const ORG_TYPES = [
  { type: "Studio", prefix: ["Pixel", "Neon", "Digital", "Cyber", "Quantum"], suffix: ["Games", "Studios", "Interactive", "Labs", "Works"] },
  { type: "Guild", prefix: ["Elite", "Shadow", "Crystal", "Phoenix", "Dragon"], suffix: ["Guild", "Alliance", "Coalition", "Federation", "Collective"] },
  { type: "DAO", prefix: ["Decentralized", "Autonomous", "Crypto", "Meta", "Web3"], suffix: ["DAO", "Protocol", "Network", "Ecosystem", "Foundation"] },
  { type: "Incubator", prefix: ["Game", "Indie", "Startup", "Innovation", "Creative"], suffix: ["Incubator", "Accelerator", "Hub", "Lab", "Factory"] },
];

// Campaign categories
const CAMPAIGN_CATEGORIES = [
  { genre: "RPG", themes: ["Fantasy", "Sci-Fi", "Post-Apocalyptic", "Medieval", "Cyberpunk"], mechanics: ["Turn-Based", "Real-Time", "Action", "Strategy"] },
  { genre: "Strategy", themes: ["War", "City Building", "Space", "Historical", "Economic"], mechanics: ["Real-Time", "Turn-Based", "4X", "Tower Defense"] },
  { genre: "Puzzle", themes: ["Abstract", "Physics", "Logic", "Match-3", "Hidden Object"], mechanics: ["Casual", "Hardcore", "Multiplayer", "Educational"] },
  { genre: "Action", themes: ["Shooter", "Platformer", "Fighting", "Racing", "Survival"], mechanics: ["Single-Player", "Multiplayer", "Co-op", "Competitive"] },
  { genre: "Simulation", themes: ["Life", "Business", "Vehicle", "Sports", "Farming"], mechanics: ["Management", "Sandbox", "Realistic", "Arcade"] },
  { genre: "VR/AR", themes: ["Immersive", "Social", "Educational", "Fitness", "Adventure"], mechanics: ["Room-Scale", "Seated", "Hand Tracking", "Mixed Reality"] },
];

// Proposal types
const PROPOSAL_TYPES = [
  "Increase marketing budget for Q2",
  "Add new developer role to team",
  "Partnership proposal with major publisher",
  "Community event funding allocation",
  "Treasury diversification strategy",
  "Governance token distribution update",
  "New game genre exploration",
  "Esports tournament sponsorship",
  "Developer tool licensing",
  "Community rewards program",
  "Cross-chain integration proposal",
  "NFT marketplace development",
  "Metaverse platform expansion",
  "Creator fund establishment",
  "Educational content creation",
];

class ProfileGenerator {
  private config: ProfileConfig;
  private contracts: any = {};
  private users: any[] = [];
  private organizations: any[] = [];
  private campaigns: any[] = [];
  private proposals: any[] = [];

  constructor(config: ProfileConfig) {
    this.config = config;
  }

  async initialize() {
    console.log("🏗️  Initializing Profile Generator...");

    // Load deployment addresses
    const deploymentPath = path.join(__dirname, '../deployment-addresses.json');
    if (!fs.existsSync(deploymentPath)) {
      throw new Error("❌ Deployment addresses not found. Run 'make deploy' first.");
    }

    const addresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    // Connect to contracts
    this.contracts.registry = await ethers.getContractAt("GameDAORegistry", addresses.registry);
    this.contracts.control = await ethers.getContractAt("Control", addresses.control);
    this.contracts.flow = await ethers.getContractAt("Flow", addresses.flow);
    this.contracts.signal = await ethers.getContractAt("Signal", addresses.signal);
    this.contracts.sense = await ethers.getContractAt("Sense", addresses.sense);
    this.contracts.gameToken = await ethers.getContractAt("MockGameToken", addresses.gameToken);
    this.contracts.usdc = await ethers.getContractAt("MockUSDC", addresses.usdc);

    console.log("✅ Contracts initialized");
  }

  generateUser(index: number): any {
    const archetype = USER_ARCHETYPES[index % USER_ARCHETYPES.length];
    const seed = `gamedao-profile-${index}-${Date.now()}`;
    const privateKey = ethers.keccak256(ethers.toUtf8Bytes(seed));
    const wallet = new ethers.Wallet(privateKey);

    // Generate realistic gaming industry name
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;

    // Generate bio based on archetype
    const bio = this.generateBio(archetype, firstName);

    return {
      index,
      name,
      bio,
      role: archetype.role,
      avatar: archetype.avatar,
      interests: archetype.interests,
      keyPair: {
        privateKey,
        publicKey: wallet.signingKey.publicKey,
        address: wallet.address
      },
      activityLevel: Math.random() * 0.8 + 0.2, // 20-100% activity
      reputation: Math.floor(Math.random() * 2000) + 500, // 500-2500 reputation
    };
  }

  generateBio(archetype: any, firstName: string): string {
    const templates = {
      "Game Developer": [
        `${firstName} is a passionate game developer with expertise in ${faker.helpers.arrayElement(['Unity', 'Unreal Engine', 'Godot', 'custom engines'])}.`,
        `Experienced ${archetype.role.toLowerCase()} specializing in ${faker.helpers.arrayElement(['indie games', 'AAA titles', 'mobile games', 'web games'])}.`,
        `${firstName} has shipped ${faker.number.int({min: 3, max: 15})} games and loves ${faker.helpers.arrayElement(['procedural generation', 'AI systems', 'multiplayer networking', 'gameplay mechanics'])}.`
      ],
      "Artist": [
        `${firstName} creates stunning ${faker.helpers.arrayElement(['3D models', 'concept art', 'character designs', 'environment art'])} for games.`,
        `Freelance artist with ${faker.number.int({min: 2, max: 10})} years experience in ${faker.helpers.arrayElement(['stylized', 'realistic', 'pixel art', 'low-poly'])} aesthetics.`,
        `${firstName} specializes in ${faker.helpers.arrayElement(['character animation', 'VFX', 'UI/UX design', 'technical art'])}.`
      ],
      "Producer": [
        `${firstName} has produced ${faker.number.int({min: 5, max: 25})} games across ${faker.helpers.arrayElement(['mobile', 'console', 'PC', 'VR'])} platforms.`,
        `Experienced game producer focused on ${faker.helpers.arrayElement(['indie development', 'live service games', 'premium titles', 'F2P games'])}.`,
        `${firstName} excels at ${faker.helpers.arrayElement(['team coordination', 'milestone planning', 'stakeholder management', 'risk assessment'])}.`
      ],
      "Designer": [
        `${firstName} designs ${faker.helpers.arrayElement(['engaging gameplay systems', 'intuitive user interfaces', 'immersive levels', 'balanced mechanics'])}.`,
        `Game designer with expertise in ${faker.helpers.arrayElement(['monetization', 'player retention', 'onboarding', 'progression systems'])}.`,
        `${firstName} has worked on ${faker.helpers.arrayElement(['puzzle games', 'strategy games', 'action games', 'simulation games'])}.`
      ],
      "Community Manager": [
        `${firstName} builds and nurtures gaming communities across ${faker.helpers.arrayElement(['Discord', 'Reddit', 'Twitter', 'Twitch'])}.`,
        `Community manager with ${faker.number.int({min: 2, max: 8})} years experience in ${faker.helpers.arrayElement(['esports', 'indie games', 'mobile games', 'MMOs'])}.`,
        `${firstName} specializes in ${faker.helpers.arrayElement(['content creation', 'event organization', 'influencer relations', 'crisis management'])}.`
      ],
      "Streamer": [
        `${firstName} streams ${faker.helpers.arrayElement(['variety games', 'competitive gaming', 'indie showcases', 'game development'])} to ${faker.number.int({min: 100, max: 50000})} followers.`,
        `Content creator focusing on ${faker.helpers.arrayElement(['educational content', 'entertainment', 'game reviews', 'tutorials'])}.`,
        `${firstName} has been streaming for ${faker.number.int({min: 1, max: 8})} years and loves ${faker.helpers.arrayElement(['community interaction', 'discovering new games', 'speedrunning', 'charity events'])}.`
      ],
      "Esports Player": [
        `${firstName} competes professionally in ${faker.helpers.arrayElement(['FPS', 'MOBA', 'Fighting Games', 'Strategy Games'])} tournaments.`,
        `Professional esports athlete with ${faker.number.int({min: 1, max: 10})} years of competitive experience.`,
        `${firstName} has won ${faker.number.int({min: 1, max: 15})} tournaments and specializes in ${faker.helpers.arrayElement(['team coordination', 'mechanical skill', 'strategy', 'mental coaching'])}.`
      ],
      "Investor": [
        `${firstName} invests in ${faker.helpers.arrayElement(['early-stage gaming startups', 'blockchain gaming', 'mobile game studios', 'esports organizations'])}.`,
        `Angel investor with a portfolio of ${faker.number.int({min: 5, max: 30})} gaming companies.`,
        `${firstName} focuses on ${faker.helpers.arrayElement(['sustainable growth', 'innovative technologies', 'market expansion', 'team development'])}.`
      ],
      "Blockchain Developer": [
        `${firstName} develops ${faker.helpers.arrayElement(['NFT games', 'DeFi protocols', 'Web3 platforms', 'smart contracts'])} for the gaming industry.`,
        `Blockchain developer with expertise in ${faker.helpers.arrayElement(['Ethereum', 'Polygon', 'Solana', 'Avalanche'])} ecosystems.`,
        `${firstName} has built ${faker.number.int({min: 3, max: 20})} Web3 projects and loves ${faker.helpers.arrayElement(['decentralized governance', 'tokenomics', 'cross-chain solutions', 'security audits'])}.`
      ],
      "Music Composer": [
        `${firstName} composes ${faker.helpers.arrayElement(['orchestral', 'electronic', 'ambient', 'chiptune'])} music for games.`,
        `Game audio composer with ${faker.number.int({min: 2, max: 12})} years experience in ${faker.helpers.arrayElement(['indie games', 'AAA titles', 'mobile games', 'VR experiences'])}.`,
        `${firstName} specializes in ${faker.helpers.arrayElement(['adaptive music systems', 'sound design', 'voice acting direction', 'audio implementation'])}.`
      ]
    };

    const roleTemplates = templates[archetype.role as keyof typeof templates] || templates["Game Developer"];
    return faker.helpers.arrayElement(roleTemplates);
  }

  generateOrganization(): any {
    const orgType = faker.helpers.arrayElement(ORG_TYPES);
    const prefix = faker.helpers.arrayElement(orgType.prefix);
    const suffix = faker.helpers.arrayElement(orgType.suffix);
    const name = `${prefix} ${suffix}`;

    const description = this.generateOrgDescription(orgType.type, name);

    return {
      name,
      description,
      type: orgType.type,
      memberCount: faker.number.int({min: 2, max: 12}),
      treasury: faker.number.int({min: 1000, max: 100000}),
    };
  }

  generateOrgDescription(type: string, name: string): string {
    const templates = {
      "Studio": [
        `${name} is an independent game development studio creating innovative gaming experiences.`,
        `We're a passionate team of developers building the next generation of interactive entertainment.`,
        `${name} specializes in ${faker.helpers.arrayElement(['indie games', 'mobile experiences', 'VR adventures', 'narrative-driven games'])}.`
      ],
      "Guild": [
        `${name} is a community of ${faker.helpers.arrayElement(['competitive gamers', 'content creators', 'game enthusiasts', 'esports athletes'])}.`,
        `We unite players who share a passion for ${faker.helpers.arrayElement(['strategic gameplay', 'competitive excellence', 'community building', 'skill development'])}.`,
        `${name} provides ${faker.helpers.arrayElement(['training resources', 'tournament opportunities', 'networking events', 'mentorship programs'])}.`
      ],
      "DAO": [
        `${name} is a decentralized organization governing ${faker.helpers.arrayElement(['gaming protocols', 'NFT ecosystems', 'play-to-earn games', 'metaverse projects'])}.`,
        `We're building the future of ${faker.helpers.arrayElement(['blockchain gaming', 'decentralized entertainment', 'community-owned games', 'Web3 experiences'])}.`,
        `${name} empowers ${faker.helpers.arrayElement(['developers', 'players', 'creators', 'investors'])} through decentralized governance.`
      ],
      "Incubator": [
        `${name} accelerates ${faker.helpers.arrayElement(['gaming startups', 'indie developers', 'creative projects', 'innovative studios'])}.`,
        `We provide ${faker.helpers.arrayElement(['funding', 'mentorship', 'resources', 'networking'])} to emerging game developers.`,
        `${name} has helped launch ${faker.number.int({min: 10, max: 100})} successful gaming projects.`
      ]
    };

    const typeTemplates = templates[type as keyof typeof templates] || templates["Studio"];
    return faker.helpers.arrayElement(typeTemplates);
  }

  generateCampaign(): any {
    const category = faker.helpers.arrayElement(CAMPAIGN_CATEGORIES);
    const theme = faker.helpers.arrayElement(category.themes);
    const mechanic = faker.helpers.arrayElement(category.mechanics);

    const title = this.generateCampaignTitle(category.genre, theme, mechanic);
    const description = this.generateCampaignDescription(category.genre, theme, mechanic, title);

    const target = faker.number.int({min: 5000, max: 100000});
    const min = Math.floor(target * 0.3);
    const max = Math.floor(target * 2);

    return {
      title,
      description,
      genre: category.genre,
      theme,
      mechanic,
      target,
      min,
      max,
      duration: faker.number.int({min: 30, max: 90}), // days
    };
  }

  generateCampaignTitle(genre: string, theme: string, mechanic: string): string {
    const prefixes = ["Project", "Chronicles of", "Legends of", "Tales of", "Age of", "Rise of", "Dawn of", "Realm of"];
    const adjectives = ["Epic", "Mystic", "Ancient", "Forgotten", "Lost", "Sacred", "Eternal", "Infinite", "Shadow", "Crystal"];
    const nouns = ["Kingdoms", "Realms", "Legends", "Heroes", "Destiny", "Odyssey", "Quest", "Adventure", "Empire", "Saga"];

    const templates = [
      `${faker.helpers.arrayElement(prefixes)} ${faker.helpers.arrayElement(adjectives)} ${faker.helpers.arrayElement(nouns)}`,
      `${theme} ${genre}: ${faker.helpers.arrayElement(adjectives)} ${faker.helpers.arrayElement(nouns)}`,
      `${faker.helpers.arrayElement(adjectives)} ${theme} ${genre}`,
      `${mechanic} ${genre} ${faker.helpers.arrayElement(nouns)}`,
    ];

    return faker.helpers.arrayElement(templates);
  }

  generateCampaignDescription(genre: string, theme: string, mechanic: string, title: string): string {
    return `${title} is an innovative ${genre.toLowerCase()} game featuring ${theme.toLowerCase()} elements and ${mechanic.toLowerCase()} gameplay. ` +
           `Players will ${faker.helpers.arrayElement(['embark on epic quests', 'build mighty empires', 'solve challenging puzzles', 'engage in thrilling battles', 'explore vast worlds', 'create unique stories'])} ` +
           `while ${faker.helpers.arrayElement(['collecting rare items', 'developing characters', 'competing with others', 'collaborating with friends', 'mastering complex systems', 'discovering secrets'])}. ` +
           `This project aims to ${faker.helpers.arrayElement(['revolutionize the genre', 'create lasting memories', 'build a strong community', 'push creative boundaries', 'deliver exceptional experiences', 'innovate gameplay mechanics'])}.`;
  }

  generateProposal(): any {
    const title = faker.helpers.arrayElement(PROPOSAL_TYPES);
    const description = this.generateProposalDescription(title);

    return {
      title,
      description,
      votingType: faker.number.int({min: 0, max: 2}), // 0: Simple, 1: Weighted, 2: Quadratic
      duration: faker.number.int({min: 7, max: 30}), // days
    };
  }

  generateProposalDescription(title: string): string {
    const reasons = [
      "to improve our competitive position in the market",
      "to better serve our community members",
      "to accelerate our development timeline",
      "to ensure long-term sustainability",
      "to expand our reach and impact",
      "to strengthen our ecosystem",
    ];

    const benefits = [
      "increased user engagement",
      "improved product quality",
      "enhanced community satisfaction",
      "better resource allocation",
      "stronger market position",
      "sustainable growth",
    ];

    return `This proposal suggests ${title.toLowerCase()} ${faker.helpers.arrayElement(reasons)}. ` +
           `Implementation would result in ${faker.helpers.arrayElement(benefits)} and ` +
           `${faker.helpers.arrayElement(['drive innovation', 'create value', 'build momentum', 'establish leadership', 'foster collaboration', 'enable success'])}. ` +
           `We believe this initiative will ${faker.helpers.arrayElement(['benefit all stakeholders', 'create positive impact', 'drive meaningful change', 'unlock new opportunities', 'strengthen our foundation', 'advance our mission'])}.`;
  }

  async createUsers() {
    console.log(`👥 Creating ${this.config.userCount} users...`);

    for (let i = 0; i < this.config.userCount; i++) {
      const user = this.generateUser(i);
      this.users.push(user);

      // Fund the user with tokens and ETH
      const [deployer] = await ethers.getSigners();
      await this.contracts.gameToken.connect(deployer).mint(user.keyPair.address, ethers.parseEther("10000"));
      await this.contracts.usdc.connect(deployer).mint(user.keyPair.address, ethers.parseUnits("5000", 6));

      // Send ETH for gas fees
      await deployer.sendTransaction({
        to: user.keyPair.address,
        value: ethers.parseEther("1.0") // 1 ETH for gas
      });

      console.log(`  ${user.avatar} ${user.name} (${user.role}) - Activity: ${Math.floor(user.activityLevel * 100)}%`);
    }
  }

  async createOrganizations() {
    console.log(`🏛️  Creating ${this.config.organizationCount} organizations...`);

    for (let i = 0; i < this.config.organizationCount; i++) {
      const org = this.generateOrganization();

      // Select random creator from users
      const creator = faker.helpers.arrayElement(this.users);
      const creatorWallet = new ethers.Wallet(creator.keyPair.privateKey, ethers.provider);

      try {
        const tx = await this.contracts.control.connect(creatorWallet).createOrganization(
          org.name,
          org.description, // metadataURI
          0, // OrgType.Project
          0, // AccessModel.Open
          0, // FeeModel.NoFees
          100, // memberLimit
          0, // membershipFee
          0 // gameStakeRequired
        );

        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => log.fragment?.name === 'OrganizationCreated');

        if (event) {
          org.id = event.args[0];
          org.creator = creator.keyPair.address;
          this.organizations.push(org);
          console.log(`  ✅ ${org.name} (${org.type})`);
        }
      } catch (error) {
        console.log(`  ❌ Failed to create ${org.name}: ${error}`);
      }
    }
  }

    async createCampaigns() {
    console.log(`💸 Creating ${this.config.campaignCount} campaigns...`);

    if (this.organizations.length === 0) {
      console.log(`  ❌ No organizations available, skipping campaign creation`);
      return;
    }

    for (let i = 0; i < this.config.campaignCount; i++) {
      const campaign = this.generateCampaign();

      // Select random organization and creator
      const org = faker.helpers.arrayElement(this.organizations);
      const creator = faker.helpers.arrayElement(this.users);
      const creatorWallet = new ethers.Wallet(creator.keyPair.privateKey, ethers.provider);

      try {
        const startTime = Math.floor(Date.now() / 1000);
        const endTime = startTime + (campaign.duration * 24 * 60 * 60);

        const tx = await this.contracts.flow.connect(creatorWallet).createCampaign(
          org.id,
          campaign.title,
          campaign.description,
          "", // metadataURI
          0, // FlowType.Funding
          this.contracts.usdc.target,
          ethers.parseUnits(campaign.target.toString(), 6),
          ethers.parseUnits(campaign.min.toString(), 6),
          ethers.parseUnits(campaign.max.toString(), 6),
          campaign.duration * 24 * 60 * 60, // duration in seconds
          false // Auto finalize
        );

        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => log.fragment?.name === 'CampaignCreated');

        if (event) {
          campaign.id = event.args[0];
          campaign.organizationId = org.id;
          campaign.creator = creator.keyPair.address;
          this.campaigns.push(campaign);
          console.log(`  ✅ ${campaign.title} (${campaign.genre})`);
        }
      } catch (error) {
        console.log(`  ❌ Failed to create ${campaign.title}: ${error}`);
      }
    }
  }

    async createProposals() {
    console.log(`🗳️  Creating ${this.config.proposalCount} proposals...`);

    if (this.organizations.length === 0) {
      console.log(`  ❌ No organizations available, skipping proposal creation`);
      return;
    }

    for (let i = 0; i < this.config.proposalCount; i++) {
      const proposal = this.generateProposal();

      // Select random organization and proposer
      const org = faker.helpers.arrayElement(this.organizations);
      const proposer = faker.helpers.arrayElement(this.users);
      const proposerWallet = new ethers.Wallet(proposer.keyPair.privateKey, ethers.provider);

      try {
        const startTime = Math.floor(Date.now() / 1000);
        const endTime = startTime + (proposal.duration * 24 * 60 * 60);

        const tx = await this.contracts.signal.connect(proposerWallet).createProposal(
          org.id,
          proposal.title,
          proposal.description,
          "", // metadataURI
          0, // ProposalType.General
          proposal.votingType,
          0, // VotingPower.Equal
          proposal.duration * 24 * 60 * 60, // votingPeriod in seconds
          "0x", // executionData (empty)
          ethers.ZeroAddress // targetContract
        );

        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => log.fragment?.name === 'ProposalCreated');

        if (event) {
          proposal.id = event.args[0];
          proposal.organizationId = org.id;
          proposal.proposer = proposer.keyPair.address;
          this.proposals.push(proposal);
          console.log(`  ✅ ${proposal.title}`);
        }
      } catch (error) {
        console.log(`  ❌ Failed to create ${proposal.title}: ${error}`);
      }
    }
  }

  async createInteractions() {
    console.log(`🎯 Creating random interactions...`);

    const interactionCount = Math.floor(this.config.userCount * this.config.interactionMultiplier);

    // Campaign contributions
    for (let i = 0; i < interactionCount && this.campaigns.length > 0; i++) {
      const campaign = faker.helpers.arrayElement(this.campaigns);
      const contributor = faker.helpers.arrayElement(this.users);

      if (Math.random() < contributor.activityLevel) {
        const contributorWallet = new ethers.Wallet(contributor.keyPair.privateKey, ethers.provider);
        const amount = faker.number.int({min: 50, max: 1000});

        try {
          // Approve USDC spending
          await this.contracts.usdc.connect(contributorWallet).approve(
            this.contracts.flow.target,
            ethers.parseUnits(amount.toString(), 6)
          );

          // Make contribution
          await this.contracts.flow.connect(contributorWallet).contribute(
            campaign.id,
            ethers.parseUnits(amount.toString(), 6)
          );

          console.log(`  💸 ${contributor.name} contributed $${amount} to "${campaign.title}"`);
        } catch (error) {
          // Silently continue on error (realistic - some contributions might fail)
        }
      }
    }

    // Proposal votes
    for (let i = 0; i < interactionCount && this.proposals.length > 0; i++) {
      const proposal = faker.helpers.arrayElement(this.proposals);
      const voter = faker.helpers.arrayElement(this.users);

      if (Math.random() < voter.activityLevel) {
        const voterWallet = new ethers.Wallet(voter.keyPair.privateKey, ethers.provider);
        const support = Math.random() > 0.4; // 60% yes, 40% no

        try {
          await this.contracts.signal.connect(voterWallet).vote(
            proposal.id,
            support,
            ethers.parseEther("100") // Voting power
          );

          console.log(`  🗳️  ${voter.name} voted ${support ? 'YES' : 'NO'} on "${proposal.title}"`);
        } catch (error) {
          // Silently continue on error
        }
      }
    }
  }

  async saveResults() {
    const output = {
      timestamp: new Date().toISOString(),
      config: this.config,
      users: this.users,
      organizations: this.organizations,
      campaigns: this.campaigns,
      proposals: this.proposals,
      summary: {
        totalUsers: this.users.length,
        totalOrganizations: this.organizations.length,
        totalCampaigns: this.campaigns.length,
        totalProposals: this.proposals.length,
      }
    };

    const outputPath = path.join(__dirname, '../generated-profiles.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`💾 Results saved to: ${outputPath}`);
    return output;
  }

  async run() {
    console.log("🚀 Starting Profile Generation...");
    console.log(`📊 Configuration: ${this.config.userCount} users, ${this.config.organizationCount} orgs, ${this.config.campaignCount} campaigns, ${this.config.proposalCount} proposals`);

    await this.initialize();
    await this.createUsers();
    await this.createOrganizations();
    await this.createCampaigns();
    await this.createProposals();
    await this.createInteractions();

    const results = await this.saveResults();

    console.log("\n🎉 Profile Generation Complete!");
    console.log("📊 Summary:");
    console.log(`  👥 Users: ${results.summary.totalUsers}`);
    console.log(`  🏛️  Organizations: ${results.summary.totalOrganizations}`);
    console.log(`  💸 Campaigns: ${results.summary.totalCampaigns}`);
    console.log(`  🗳️  Proposals: ${results.summary.totalProposals}`);

    return results;
  }
}

// CLI Interface
async function main() {
  // Parse arguments from environment variables or command line
  const userCount = parseInt(process.env.USERS || process.argv[2]) || 10;
  const organizationCount = parseInt(process.env.ORGS || process.argv[3]) || Math.ceil(userCount / 3);
  const campaignCount = parseInt(process.env.CAMPAIGNS || process.argv[4]) || Math.ceil(userCount / 2);
  const proposalCount = parseInt(process.env.PROPOSALS || process.argv[5]) || Math.ceil(userCount / 4);
  const interactionMultiplier = parseFloat(process.env.MULTIPLIER || process.argv[6]) || 1.5;

  const config: ProfileConfig = {
    userCount,
    organizationCount,
    campaignCount,
    proposalCount,
    interactionMultiplier
  };

  const generator = new ProfileGenerator(config);
  await generator.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
}
