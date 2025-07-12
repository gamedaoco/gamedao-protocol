---
title: "Battlepass Enhanced Design Specification"
date: "2025-01-13"
status: "specification"
category: "modules"
source: "packages/pallets/battlepass/readme.md"
priority: "high"
---

# Battlepass Enhanced Design Specification

## Overview

This document incorporates the vital design information from the original Battlepass readme, providing comprehensive specifications for the subscription-based engagement protocol designed specifically for gaming guilds and DAOs.

## Core Definitions & Terminology

### Gaming Ecosystem Terms
- **Guild**: A group of people gaming together (also Clan, Team, Crew, Squad, Party)
- **BattlePass (BP)**: A subscription-based engagement protocol for gaming guilds
- **Quest (Q)**: A group of tasks, bounties, etc. on related games and media platforms
- **Quest Progress (QP)**: Non-binary/float fulfillment status (0...1) of Quest completion

### Point System Architecture
- **XP (Experience Points)**: Task-based points earned within BattlePass context, may reset each season
- **REP (Reputation Points)**: Global street credibility score persisting across seasons
- **TRUST (Trust Level)**: Verification-based score from connected credentials (Twitter, Discord, Twitch, Web3 identities)
- **Level (L)**: Achievement tier reached by collecting points

### Achievement Framework
Achievements serve as:
1. **NFT Proof of Achievement**: Immutable on-chain verification
2. **Redemption Enabler**: Grants account controller ability to redeem rewards
3. **Templated Structure**: Composed of:
   - **Immutable NFT Configuration**: Permanent achievement metadata
   - **Mutable Payload Data**: Dynamic achievement progress and status

## DAO Integration Requirements

### Activation Prerequisites
A DAO must meet the following criteria to enable BattlePass functionality:

#### Token Requirements
- **GAME Token Staking**: 1,000 GAME tokens staked to protocol treasury
- **Automatic Activation**: BattlePass section becomes available immediately upon staking

#### Reputation Thresholds
- **Experience (XP)**: > 100
- **Reputation (REP)**: > 100
- **Trust (TRUST)**: > 100
- **Member Count**: > 10 active members

### Default Configuration System

#### DAO-Specific Mapping
- **XP/REP/TRUST Mapping**: Custom scoring system per organization
- **Achievement Thresholds**: Organization-specific level requirements
- **Reward Structures**: Customizable reward distribution models

#### Season Mechanics
- **Default Duration**: 100 days per season
- **Block-based Calculation**: Based on host chain blocktime
  - 6-second blocktime = 14,400 blocks/day
  - Season length = 144,000 blocks (configurable)
- **Automatic Reset**: Score resets at season conclusion
- **Multi-season Subscriptions**: Users can subscribe for 1-n seasons

## Points Calculation Formula

### Mathematical Framework
```
P = MAP × (1 × subscription_multiplier) +
    ACTIVATION_FACTOR × (
        1 +
        XP(season) × (1 + REP/100) × (1 + TRUST × 100)
    )
```

Where:
- **MAP**: Individual achievement/level mapping coefficient
- **subscription_multiplier**: Subscription tier benefit multiplier
- **ACTIVATION_FACTOR**: Currently set to 0 (draft formula)
- **XP(season)**: Current season experience points (local)
- **REP**: Global reputation score (/100 normalization)
- **TRUST**: Global trust score (×100 amplification)

### Subscription Benefits
- **Free Play Available**: Basic participation without subscription
- **Subscription Advantage**: Multiplier enables meaningful progress toward claimable rewards
- **Tiered Access**: Different subscription levels provide varying multipliers

## Reward System Architecture

### Reward Structure
Each reward is defined by a triple: `{Score_Threshold, (Reward_Object, Point_Cost)}`

**Example**: `{1000, (item_drop_dragonball_nft, 0)}`
- **Score Threshold**: 1000 points required
- **Reward Object**: Dragon Ball themed NFT drop
- **Point Cost**: 0 additional points to claim (threshold sufficient)

### NFT-Based Collectibles
Rewards delivered as blockchain-based collectibles:
- **Proof of Achievement**: Verification of milestone completion
- **Proof of Participation**: Recognition of engagement
- **Tickets**: Access tokens for events or content
- **Collectibles**: Tradeable gaming assets
- **Utility Items**: Functional game enhancements

## User Experience Flow

### Onboarding Requirements
**Step 0**: Dual signup requirement
- **Discord Account**: Primary social verification
- **Wallet Connection**: Blockchain identity anchoring

### Social Account Integration
**Priority Integration Sequence**:
1. **Discord** → Primary proof-of-concept end-to-end integration
2. **Twitter** → Secondary integration due to relevance
3. **Twitch** → Streaming platform integration (to be determined)
4. **Polkadot Compatible Wallet** → Talisman wallet preferred
5. **Extended Platforms** → Open to community suggestions

### Payment & Subscription System

#### Payment Methods
- **PSP Integration**: Traditional FIAT payment processing
- **Stablecoin Direct**: USDT direct payment option
- **Flexible Terms**: One-time or subscription-based payment models

#### User Interface Elements
1. **XP Progress Bar**: Visual progression indicator
2. **Subscription CTA**: Clear call-to-action for non-subscribed users
3. **Level Requirements**: Transparent point requirements for each reward
4. **Dynamic Claim Button**: Enabled when score thresholds are met

### Quest & Progress Browsing
- **Quest Discovery**: Browse available quests and requirements
- **Progress Tracking**: Real-time quest completion status
- **Multi-platform Activities**: Quests spanning games, Discord, Twitter, Twitch
- **Verification System**: Automated proof validation for quest completion

## Technical Integration Points

### Sense Module Integration
**Global Reputation Mapping**:
```
map global (season, xp, rep, trust)
map local (season, xp, rep, trust)
```

**Data Flow**:
- **Global Scores**: Persistent across all organizations and seasons
- **Local Scores**: Organization-specific and season-specific tracking
- **Cross-pollination**: Local achievements can influence global reputation

### Control Module Integration
- **Organization Validation**: Verify DAO eligibility and status
- **Member Management**: Track member participation and benefits
- **Treasury Integration**: Handle subscription payments and reward funding
- **Prime Account Access**: DAO administration and configuration management

### Social Verification Framework

#### Discord Integration
- **Guild Membership Verification**: Confirm user participation in gaming communities
- **Activity Tracking**: Monitor engagement levels and contribution quality
- **Role-based Rewards**: Different quest availability based on Discord roles
- **Community Challenges**: Guild-wide collaborative quests

#### Twitter Integration
- **Social Proof**: Verify authentic social engagement
- **Content Creation**: Reward quality content creation and sharing
- **Viral Mechanics**: Bonus points for high-engagement posts
- **Brand Advocacy**: Quests promoting GameDAO ecosystem

#### Twitch Integration
- **Streaming Verification**: Confirm live streaming activities
- **Viewership Metrics**: Reward based on audience engagement
- **Gaming Content**: Verify specific game streaming requirements
- **Community Building**: Foster streamer-audience DAO relationships

## Season Management System

### Automated Season Transitions
- **Seamless Rollover**: Automatic season boundaries without manual intervention
- **Score Archival**: Historical data preservation for analytics
- **Reward Distribution**: End-of-season reward calculations and distribution
- **New Season Initialization**: Fresh quest pools and achievement targets

### Cross-Season Persistence
- **Reputation Carryover**: Global REP and TRUST scores persist
- **Achievement History**: Permanent record of all earned achievements
- **Subscription Continuity**: Multi-season subscriptions remain active
- **Guild Relationships**: DAO memberships and relationships maintained

## Security & Verification

### Anti-Gaming Mechanisms
- **Multi-platform Verification**: Require proof from multiple social platforms
- **Behavioral Analysis**: Detect and prevent artificial engagement
- **Community Validation**: Peer verification for subjective quest completion
- **Penalty System**: Reputation penalties for fraudulent activities

### Privacy Controls
- **Selective Disclosure**: Users control which achievements are public
- **Data Minimization**: Only essential verification data stored on-chain
- **Consent Management**: Granular permissions for social account access
- **Right to Deletion**: Compliance with data protection regulations

## Monetization & Economics

### Revenue Streams
1. **Subscription Fees**: Primary revenue from user subscriptions
2. **DAO Activation Fees**: GAME token staking requirements
3. **Premium Features**: Enhanced quest types and reward tiers
4. **Marketplace Integration**: Transaction fees on reward trading

### Token Economics
- **GAME Token Utility**: Required for DAO activation and premium features
- **Staking Incentives**: Staked tokens earn protocol fee distributions
- **Burn Mechanisms**: Deflationary pressure through achievement minting
- **Liquidity Mining**: Reward active participants with additional tokens

## Future Expansion Roadmap

### Phase 1: Core Implementation
- Basic quest system with Discord/Twitter integration
- Subscription management and payment processing
- NFT achievement minting and distribution
- DAO activation and configuration

### Phase 2: Enhanced Gaming
- Advanced quest types with game API integration
- Real-time progress tracking and validation
- Social features and leaderboards
- Cross-platform identity management

### Phase 3: Ecosystem Integration
- Third-party game developer SDK
- Marketplace for quest creation and trading
- Advanced analytics and reporting
- Enterprise DAO management tools

### Phase 4: Decentralized Governance
- Community-governed quest approval
- Decentralized reward distribution
- Cross-chain BattlePass compatibility
- AI-powered quest generation

## Implementation Considerations

### Scalability Requirements
- **High-Frequency Updates**: Support for real-time quest progress
- **Batch Processing**: Efficient handling of bulk operations
- **Cross-Chain Compatibility**: Multi-blockchain deployment strategy
- **API Rate Limiting**: Manage third-party integration constraints

### Performance Targets
- **Quest Verification**: < 30 seconds for social platform verification
- **Progress Updates**: Real-time reflection of achievement progress
- **Reward Claims**: < 2 minutes from eligibility to NFT minting
- **Season Transitions**: < 1 hour for complete season rollover

This enhanced design specification provides the foundation for implementing a comprehensive BattlePass system that serves the unique needs of gaming DAOs while maintaining the social, engaging, and rewarding experience that makes gaming communities thrive.
