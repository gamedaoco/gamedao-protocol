# 111 - Phase 1, Section 2: Route Structure Implementation

**Date**: December 2024
**Status**: 🔄 IN PROGRESS
**Phase**: 1 of 8
**Section**: 2 of 4 (Route Structure Implementation)
**Previous**: 110-phase-1-section-1-completed.md
**Next**: 112-phase-1-section-3-hooks.md

## Section Overview

Implement consistent URL patterns and dynamic routes across all GameDAO modules, ensuring seamless navigation and proper data flow between list and detail views.

## 🎯 Objectives

### 1. Dynamic Route Creation
- Create detail pages for all entity types
- Implement consistent URL patterns
- Ensure proper parameter handling

### 2. Navigation Integration
- Update all "View Details" buttons to navigate properly
- Implement breadcrumb generation
- Add back navigation support

### 3. Route Structure Standards
- Consistent URL patterns across modules
- Proper error handling for invalid routes
- Loading states during navigation

## 📋 Implementation Tasks

### ✅ Completed
- [x] **Organization Detail Route**: `/control/organizations/[id]`
  - Full DetailPageLayout implementation
  - Tab navigation structure
  - Error and loading states

- [x] **Campaign Detail Route**: `/flow/campaigns/[id]/page.tsx`
  - Complete DetailPageLayout integration
  - Real campaign data integration
  - Funding progress visualization
  - Contribution interface
  - Organization relationship display

- [x] **Proposal Detail Route**: `/signal/proposals/[id]/page.tsx`
  - Full voting interface implementation
  - Real-time voting results
  - User voting power display
  - Discussion preview
  - Comprehensive proposal metadata

- [x] **Staking Pool Detail Route**: `/staking/pools/[id]/page.tsx`
  - Complete pool statistics
  - User position management
  - Staking/unstaking interface
  - Pool benefits display
  - Activity and staker views

### 🔄 In Progress

#### 1. Navigation Updates
- [x] **Campaign List Page**: Updated with EntityCard and navigation
- [x] **Proposal List Page**: Added navigation to detail pages
- [x] **Staking Pools Page**: Added "View Details" buttons
- [ ] **Profile Detail Routes**: Profile pages not yet implemented

#### 2. Sub-routes (Future Implementation)
- [ ] **Campaign Sub-routes**:
  - `/flow/campaigns/[id]/updates/page.tsx`
  - `/flow/campaigns/[id]/contributors/page.tsx`
  - `/flow/campaigns/[id]/comments/page.tsx`

- [ ] **Proposal Sub-routes**:
  - `/signal/proposals/[id]/discussion/page.tsx`
  - `/signal/proposals/[id]/votes/page.tsx`
  - `/signal/proposals/[id]/history/page.tsx`

- [ ] **Staking Pool Sub-routes**:
  - `/staking/pools/[id]/stakers/page.tsx`
  - `/staking/pools/[id]/rewards/page.tsx`
  - `/staking/pools/[id]/history/page.tsx`

### 5. Navigation Updates
- [ ] **Update List Pages**: Add proper href links to EntityCards
- [ ] **Update Existing Pages**: Replace hardcoded navigation
- [ ] **Breadcrumb System**: Automatic breadcrumb generation
- [ ] **Back Navigation**: Consistent back button behavior

## 🏗️ Route Structure Standards

### URL Pattern Template
```
/{module}                           # Module overview
/{module}/{entities}                # Entity list
/{module}/{entities}/[id]           # Entity detail (main)
/{module}/{entities}/[id]/{subpage} # Entity subpage
/{module}/create                    # Create new entity
```

### Implementation Examples
```
/control                           # Control module overview
/control/organizations             # Organizations list
/control/organizations/0x123       # Organization detail
/control/organizations/0x123/members  # Organization members
/control/create                    # Create organization

/flow/campaigns                    # Campaigns list
/flow/campaigns/0x456              # Campaign detail
/flow/campaigns/0x456/updates      # Campaign updates
/flow/create                       # Create campaign

/signal/proposals                  # Proposals list
/signal/proposals/0x789            # Proposal detail
/signal/proposals/0x789/votes      # Proposal votes
/signal/create                     # Create proposal
```

### Tab Navigation Structure
Each detail page will have consistent tab structure:
- **Main Tab**: Overview/Details (always first)
- **Related Entities**: Members, Contributors, Voters
- **Activity**: Updates, Comments, History
- **Actions**: Specific to entity type

## 🔧 Technical Implementation

### Page Component Pattern
```typescript
interface DetailPageProps {
  params: Promise<{ id: string }> // or { address: string }
}

export default function EntityDetailPage({ params }: DetailPageProps) {
  const { id } = use(params)
  const { entity, isLoading, error, refetch } = useEntity(id)

  // Loading state
  if (isLoading) return <DetailPageLayout loading={true} />

  // Error state
  if (error) return <DetailPageLayout><ErrorState /></DetailPageLayout>

  // Not found state
  if (!entity) return <DetailPageLayout><EmptyState /></DetailPageLayout>

  // Main render with DetailPageLayout
  return (
    <ErrorBoundary>
      <DetailPageLayout
        title={entity.name}
        breadcrumbs={[...]}
        tabs={[...]}
        primaryAction={...}
        sidebar={...}
      >
        {/* Entity-specific content */}
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
```

### Hook Integration Pattern
```typescript
// Individual entity hooks to be implemented
function useEntity(id: string) {
  const { entities, isLoading, error, refetch } = useEntities()

  return {
    entity: entities?.find(e => e.id === id),
    isLoading,
    error,
    refetch,
    // Additional entity-specific data
    relatedData: [], // TODO: Fetch related data
    actions: [], // TODO: Fetch available actions
  }
}
```

## 📊 Success Metrics

### Route Coverage
- [ ] **4 Main Entity Types**: Organization, Campaign, Proposal, Profile, Pool
- [ ] **16+ Detail Pages**: Main + sub-pages for each entity
- [ ] **Consistent Navigation**: All "View Details" buttons working
- [ ] **Error Handling**: 404s and loading states properly handled

### User Experience
- [ ] **Fast Navigation**: Instant page transitions
- [ ] **Breadcrumb Navigation**: Always know where you are
- [ ] **Back Button Support**: Proper browser back button behavior
- [ ] **Deep Linking**: All pages accessible via direct URL

### Technical Quality
- [ ] **Zero TypeScript Errors**: All routes properly typed
- [ ] **Consistent Patterns**: Same structure across all routes
- [ ] **Performance**: Fast page loads with proper caching
- [ ] **SEO Ready**: Proper meta tags and page titles

## 🎨 Design Consistency

### Layout Standards
- **Header**: Title, subtitle, status badge, actions
- **Navigation**: Breadcrumbs, back button, tabs
- **Content**: Main content area with optional sidebar
- **Loading**: Skeleton states during data fetching
- **Errors**: Consistent error handling and messaging

### Tab Navigation Rules
- **First Tab**: Always the main overview/details
- **Logical Order**: Related content grouped together
- **Badge Counts**: Show counts where applicable
- **Current State**: Clear indication of active tab

## 🔍 Implementation Priority

### Phase 1: Core Routes (This Section)
1. **Campaign Detail Page** - High user engagement
2. **Proposal Detail Page** - Critical for governance
3. **Profile Detail Page** - User identity and reputation
4. **Staking Pool Detail Page** - Financial operations

### Phase 2: Sub-routes (Next Section)
1. **High-Priority Sub-pages**: Members, Contributors, Votes
2. **Activity Pages**: Updates, Comments, History
3. **Specialized Pages**: Treasury, Rewards, Achievements

### Phase 3: Navigation Polish
1. **List Page Updates**: All EntityCard href links
2. **Breadcrumb Automation**: Dynamic breadcrumb generation
3. **Search Integration**: Deep linking from search results
4. **Mobile Optimization**: Touch-friendly navigation

## 📝 Implementation Notes

### URL Parameter Handling
- **Organizations**: Use hex ID from contract
- **Campaigns**: Use hex ID from contract
- **Proposals**: Use hex ID from contract
- **Profiles**: Use wallet address
- **Pools**: Use pool ID from contract

### Error Scenarios to Handle
- **Invalid ID**: Show not found page
- **Network Errors**: Show retry option
- **Loading States**: Show skeleton immediately
- **Permission Errors**: Show access denied message

### Performance Considerations
- **Code Splitting**: Each route as separate chunk
- **Prefetching**: Prefetch related data on hover
- **Caching**: Cache entity data across navigation
- **Lazy Loading**: Load sub-pages on demand

---

**Start Date**: December 2024
**Estimated Completion**: 1-2 days
**Dependencies**: Foundation components (completed)
**Next Milestone**: Individual entity hooks implementation
