# Frontend Architecture Overhaul

**Date**: 2024-06-21
**Phase**: Frontend UI/UX Enhancement & Route Structure
**Status**: 🚧 Planning

## Objective
Implement a complete frontend architecture overhaul with proper routing, user onboarding, dashboard, and UI improvements following modern design patterns.

## Current State Analysis

### Existing Structure ✅
- **Layout**: AppLayout with TopBar, Sidebar, Footer
- **Routes**: Basic `/control/organizations` and `/flow/campaigns`
- **Components**: WalletConnection, PortfolioCard, ReputationCard
- **Theming**: Dark/Light theme with system preference
- **State**: Web3Provider with wallet connection

### Issues Identified 🔴
1. **Routing**: Missing module overview pages and dashboard
2. **Navigation**: Top bar items not left-aligned after logo
3. **Onboarding**: No user profile creation flow
4. **Dashboard**: No personalized user dashboard
5. **UI**: Inconsistent backgrounds, footer layout issues
6. **State**: No GraphQL integration, limited app state management
7. **Theming**: Default theme should be light, not system
8. **User Management**: No username registry system

## Implementation Plan

### Phase 1: Core Architecture & Routing 🏗️

#### 1.1 Route Structure Implementation
```
/                     - Landing page
/dashboard           - User dashboard (redirect to connect if not authenticated)
/onboarding          - User profile creation flow
/settings            - User settings and username claiming

/control             - Control module overview (all DAOs)
/control/create      - Create new DAO
/control/[id]        - DAO details page

/flow                - Flow module overview (all campaigns)
/flow/create         - Create new campaign
/flow/[id]           - Campaign details page

/signal              - Signal module overview (all proposals)
/signal/create       - Create new proposal
/signal/[id]         - Proposal details page

/sense               - Sense module overview (profiles/reputation)
/sense/[username]    - User profile page
```

#### 1.2 Layout & Navigation Updates
- **Top Bar**: Left-align navigation items after logo
- **Footer**: Full-width spanning, automatic year update
- **Sidebar**: End above footer, not spanning full height
- **Theme**: Set light theme as default

#### 1.3 State Management Architecture
```typescript
// App State Structure
interface AppState {
  user: UserProfile | null
  daos: DAO[]
  campaigns: Campaign[]
  proposals: Proposal[]
  notifications: Notification[]
}

// GraphQL Integration
- Apollo Client setup
- Subgraph queries
- Real-time subscriptions
- Cache management
```

### Phase 2: User Experience & Onboarding 👤

#### 2.1 User Onboarding Flow
1. **Wallet Connection** - Multi-wallet support (existing)
2. **Profile Creation** - Name, bio, avatar, preferences
3. **Username Claiming** - Unique username registry
4. **Welcome Tour** - Interactive guide to features

#### 2.2 Dashboard Implementation
```typescript
// Dashboard Components
- Portfolio Overview (existing, enhanced)
- Active Participations (DAOs, campaigns, proposals)
- Notifications & Activity Feed
- Quick Actions (Create DAO, Launch Campaign, etc.)
- Reputation Progress
- Recent Transactions
```

#### 2.3 Settings & Profile Management
- **Profile Settings**: Update name, bio, avatar
- **Username Registry**: Claim/update username
- **Notification Preferences**: Email, push, in-app
- **Privacy Settings**: Profile visibility, data sharing
- **Connected Wallets**: Manage multiple wallets

### Phase 3: Module Pages & Functionality 📊

#### 3.1 Control Module (DAO Management)
```typescript
// /control - Overview Page
- DAO Grid/List View
- Filter & Search
- Create DAO Button
- Statistics Cards

// /control/[id] - DAO Details
- DAO Info & Stats
- Member Management
- Treasury Overview
- Governance Actions
- Activity Feed
```

#### 3.2 Flow Module (Campaigns)
```typescript
// /flow - Overview Page
- Campaign Grid/List View
- Filter by status, type, category
- Create Campaign Button
- Featured Campaigns

// /flow/[id] - Campaign Details
- Campaign Info & Progress
- Contribution Interface
- Updates & Comments
- Backer List
- Reward Tiers
```

#### 3.3 Signal Module (Governance)
```typescript
// /signal - Overview Page
- Proposal List
- Filter by status, DAO, type
- Create Proposal Button
- Voting Statistics

// /signal/[id] - Proposal Details
- Proposal Content
- Voting Interface
- Discussion Thread
- Voting History
- Execution Status
```

#### 3.4 Sense Module (Identity & Reputation)
```typescript
// /sense - Overview Page
- User Directory
- Reputation Leaderboard
- Achievement Gallery
- Profile Search

// /sense/[username] - User Profile
- User Info & Stats
- Reputation History
- Achievement Badges
- Activity Timeline
- DAO Memberships
```

### Phase 4: UI/UX Enhancements 🎨

#### 4.1 Design System Improvements
- **Consistent Spacing**: Standardize padding/margins
- **Color Palette**: Ensure proper contrast ratios
- **Typography**: Consistent font sizes and weights
- **Components**: Standardize button styles, form inputs
- **Animations**: Smooth transitions and micro-interactions

#### 4.2 Responsive Design
- **Mobile-First**: Optimize for mobile devices
- **Tablet Support**: Proper layout for tablet screens
- **Desktop Enhancement**: Utilize larger screen space
- **Touch Interactions**: Proper touch targets

#### 4.3 Accessibility Improvements
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels
- **Color Contrast**: Meet WCAG guidelines
- **Focus Management**: Clear focus indicators

### Phase 5: Data Integration & State Management 🔄

#### 5.1 GraphQL Integration
```typescript
// Subgraph Queries
- Organizations (DAOs)
- Campaigns
- Proposals
- User Profiles
- Transactions
- Events

// Real-time Updates
- WebSocket subscriptions
- Optimistic updates
- Cache invalidation
- Error handling
```

#### 5.2 State Management
```typescript
// Context Providers
- UserProvider
- DAOProvider
- CampaignProvider
- ProposalProvider
- NotificationProvider

// Custom Hooks
- useUser
- useDAOs
- useCampaigns
- useProposals
- useNotifications
```

## Technical Implementation Details

### File Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── onboarding/
│   │   └── dashboard/
│   ├── control/
│   │   ├── page.tsx
│   │   ├── create/
│   │   └── [id]/
│   ├── flow/
│   │   ├── page.tsx
│   │   ├── create/
│   │   └── [id]/
│   ├── signal/
│   │   ├── page.tsx
│   │   ├── create/
│   │   └── [id]/
│   ├── sense/
│   │   ├── page.tsx
│   │   └── [username]/
│   └── settings/
├── components/
│   ├── ui/ (shadcn components)
│   ├── layout/
│   ├── forms/
│   ├── dashboard/
│   ├── modules/
│   └── onboarding/
├── hooks/
│   ├── useUser.ts
│   ├── useDAOs.ts
│   ├── useCampaigns.ts
│   └── useProposals.ts
├── lib/
│   ├── graphql/
│   ├── utils/
│   └── constants/
└── providers/
    ├── apollo-provider.tsx
    ├── user-provider.tsx
    └── notification-provider.tsx
```

### Component Architecture
```typescript
// Modular Component Structure
interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

// Separation of Concerns
- UI Components (pure, reusable)
- Business Logic (hooks, providers)
- Data Layer (GraphQL, cache)
- State Management (context, reducers)
```

## Implementation Steps

### Step 1: Foundation (Session 1) ✅ COMPLETED
1. ✅ Update layout structure (footer, sidebar)
2. ✅ Fix theme default to light
3. ✅ Left-align navigation items
4. ✅ Create route structure
5. ✅ Update footer with current year

**Implementation Details:**
- **Layout**: Modified `app-layout.tsx` to make footer full-width, sidebar ends above footer
- **Theme**: Changed default from "system" to "light" in `layout.tsx`
- **Navigation**: Left-aligned nav items after logo in `top-bar.tsx`, updated routes
- **Footer**: Added automatic current year calculation, improved network info display
- **Module Pages**: Created comprehensive overview pages for all 4 modules:
  - `/control` - DAO management with stats and organization list
  - `/flow` - Campaign discovery with progress tracking and categories
  - `/signal` - Governance proposals with voting interface and status filters
  - `/sense` - Profile/reputation system with leaderboard and achievements
- **UI Components**: Added Avatar component with Radix UI integration
- **Responsive Design**: Proper spacing, hover effects, mobile-first approach
- **State Management**: Wallet connection awareness throughout all pages

**Files Modified/Created:**
- `packages/frontend/src/app/layout.tsx` - Theme default
- `packages/frontend/src/components/layout/app-layout.tsx` - Layout structure
- `packages/frontend/src/components/layout/footer.tsx` - Auto year, full-width
- `packages/frontend/src/components/layout/top-bar.tsx` - Left-aligned navigation
- `packages/frontend/src/app/control/page.tsx` - DAO overview page (NEW)
- `packages/frontend/src/app/flow/page.tsx` - Campaign overview page (NEW)
- `packages/frontend/src/app/signal/page.tsx` - Governance overview page (NEW)
- `packages/frontend/src/app/sense/page.tsx` - Profile overview page (NEW)
- `packages/frontend/src/components/ui/avatar.tsx` - Avatar component (NEW)

**Commit**: `ba7d1910f` - feat(frontend): implement foundation improvements and module overview pages

### Step 2: Routing & Navigation (Session 2) ✅ COMPLETED
1. ✅ Implement module overview pages
2. ✅ Create dashboard route with auth check
3. ✅ Add onboarding flow
4. ✅ Update navigation logic

**Implementation Details:**
- **Dashboard Page** (`/dashboard`): Comprehensive user dashboard with:
  - User stats (DAOs, contributions, votes, reputation)
  - Portfolio integration (existing PortfolioCard)
  - Active participations (DAO memberships, campaign contributions)
  - Quick actions sidebar (Create DAO, Launch Campaign, Create Proposal)
  - Recent activity feed
  - Auth redirect to home if not connected
- **Onboarding Flow** (`/onboarding`): 3-step profile creation:
  - Step 1: Username, display name, avatar upload
  - Step 2: Bio with live preview
  - Step 3: Interest selection with profile summary
  - Progress indicator and validation
  - Redirects to dashboard on completion
- **Settings Page** (`/settings`): Tabbed interface with:
  - Profile: Edit username, display name, bio, interests, avatar
  - Notifications: Configure notification preferences
  - Privacy: Profile visibility and activity tracking
  - Wallets: Manage connected wallet addresses
- **Navigation**: Added Dashboard link (only visible when wallet connected)
- **UI Components**: Created Input, Label, Textarea with proper TypeScript types
- **Dependencies**: Added @radix-ui/react-label, class-variance-authority

**Files Created:**
- `packages/frontend/src/app/dashboard/page.tsx` - User dashboard (NEW)
- `packages/frontend/src/app/onboarding/page.tsx` - Profile creation flow (NEW)
- `packages/frontend/src/app/settings/page.tsx` - Settings management (NEW)
- `packages/frontend/src/components/ui/input.tsx` - Input component (NEW)
- `packages/frontend/src/components/ui/label.tsx` - Label component (NEW)
- `packages/frontend/src/components/ui/textarea.tsx` - Textarea component (NEW)

**Files Modified:**
- `packages/frontend/src/components/layout/top-bar.tsx` - Added dashboard link
- `packages/frontend/package.json` - Added dependencies

**Commit**: `9b883a809` - feat(frontend): implement dashboard, onboarding, and settings pages

### Major Integration Commit ✅ COMPLETED
**Commit**: `19e5e979d` - feat: integrate Signal module and enhance frontend components

**Comprehensive Integration:**
- **Signal & Sense Integration**: Added ABI files and subgraph handlers for governance and reputation modules
- **Frontend Components**: Created comprehensive dashboard components (treasury, reputation cards)
- **Navigation**: Implemented sidebar navigation and mode toggle components
- **User Management**: Added user registration modal and enhanced hooks
- **UI Components**: Created dropdown menu, progress bar, and other essential UI elements
- **Page Structure**: Added organization and campaign detail page structures
- **Build System**: Updated gitignore, added docker-compose for graph development
- **Dependencies**: Updated package dependencies and lock files

**Files Added/Modified**: 68 files changed, 19,163 insertions, 1,591 deletions

### Step 3: User Management (Session 3)
1. 🚧 User profile creation
2. 🚧 Username registry system
3. 🚧 Settings page
4. 🚧 Dashboard implementation

### Step 4: Module Enhancement (Session 4)
1. 🚧 Control module overview
2. 🚧 Flow module overview
3. 🚧 Signal module overview
4. 🚧 Sense module overview

### Step 5: Data Integration (Session 5)
1. 🚧 GraphQL setup
2. 🚧 Real data integration
3. 🚧 State management
4. 🚧 Error handling

## Success Metrics

### User Experience
- **Onboarding**: < 2 minutes to complete
- **Navigation**: Intuitive and consistent
- **Performance**: < 3s page load times
- **Accessibility**: WCAG 2.1 AA compliance

### Technical Quality
- **Type Safety**: 100% TypeScript coverage
- **Test Coverage**: > 80% component testing
- **Bundle Size**: < 500KB gzipped
- **Lighthouse Score**: > 90 across all metrics

### Business Goals
- **User Retention**: Clear user journey
- **Feature Discovery**: Easy access to all modules
- **Community Building**: Social features and profiles
- **Governance Participation**: Streamlined voting/proposals

## Risk Assessment

### Low Risk ✅
- UI component updates
- Route structure changes
- Theme configuration

### Medium Risk 🟡
- State management complexity
- GraphQL integration
- User authentication flow

### High Risk 🔴
- Data migration and consistency
- Performance with real data
- Cross-module interactions

---

**Next Session**: Start with Step 1 - Foundation improvements
**Priority**: Fix layout issues and implement basic route structure
**Focus**: Clean, minimal implementation with proper separation of concerns
