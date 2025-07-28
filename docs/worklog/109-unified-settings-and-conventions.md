# 109 - Unified Settings & Conventions

**Document Type**: Reference & Standards
**Status**: Living Document - Updated throughout implementation
**Priority**: Critical - Source of truth for all development decisions
**Last Updated**: December 2024

## Purpose

This document captures all unified settings, conventions, learnings, and design decisions made during the GameDAO Protocol frontend implementation. It serves as the single source of truth to prevent getting lost and ensure consistency across all phases.

## Naming Conventions

### Code Standards
- **Components**: PascalCase (`EntityCard`, `DetailPageLayout`)
- **Files**: kebab-case (`entity-card.tsx`, `detail-page-layout.tsx`)
- **Hooks**: camelCase with `use` prefix (`useOrganization`, `useCampaign`)
- **Variables**: camelCase (`organizationData`, `isLoading`)
- **Constants**: SCREAMING_SNAKE_CASE (`POOL_PURPOSES`, `CONTRACT_ADDRESSES`)
- **GraphQL**: PascalCase for types, camelCase for fields

### Directory Structure
```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── layout/       # Layout components
│   ├── forms/        # Form components
│   └── [module]/     # Module-specific components
├── hooks/            # Custom hooks
├── lib/              # Utilities and configurations
├── types/            # TypeScript type definitions
└── app/              # Next.js app router pages
```

## Design Philosophy

### UI Principles
- **Minimal UI**: Clean, uncluttered interfaces
- **Limited Icons**: Use icons sparingly, prioritize typography and whitespace
- **Card-Based Profiles**: Use cards instead of lists for profiles to showcase visuals
- **Visual Hierarchy**: Clear information hierarchy with proper spacing
- **Accessibility First**: WCAG 2.1 compliance from the start

### Technical Principles
- **Separation of Concerns**: Clear separation between UI, logic, and data
- **DRY (Don't Repeat Yourself)**: Reusable components and patterns
- **Type Safety**: Comprehensive TypeScript usage
- **Performance**: Lazy loading, code splitting, optimized rendering
- **Responsive Design**: Mobile-first approach

## Component Architecture

### Standard Component Pattern
```typescript
// Component interface
interface ComponentProps {
  // Required props first
  data: EntityType
  // Optional props with defaults
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
  // Event handlers
  onAction?: (action: ActionType) => void
}

// Component implementation
export function Component({
  data,
  variant = 'default',
  className,
  onAction
}: ComponentProps) {
  // Hooks at the top
  const { isLoading, error } = useEntityData(data.id)

  // Early returns for loading/error states
  if (isLoading) return <ComponentSkeleton />
  if (error) return <ErrorState error={error} />

  // Main render
  return (
    <div className={cn('base-styles', className)}>
      {/* Component content */}
    </div>
  )
}
```

### Hook Pattern
```typescript
// Standard hook interface
interface UseEntityOptions {
  enabled?: boolean
  refetchInterval?: number
}

interface UseEntityReturn<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
  mutate: (data: Partial<T>) => Promise<void>
}

// Hook implementation
export function useEntity<T>(
  id: string,
  options: UseEntityOptions = {}
): UseEntityReturn<T> {
  // Implementation
}
```

## Visual Design Standards

### Card Design Specifications

#### Profile Cards
- **Layout**: Visual-first with avatar/image prominence
- **Content**: Name, role, reputation score, key metrics
- **Actions**: Minimal - view profile, connect/follow
- **Visuals**: IPFS-hosted avatars, gradient backgrounds
- **Size**: Consistent aspect ratio, responsive scaling

#### Entity Cards (Organizations, Campaigns, Proposals)
- **Layout**: Content-first with optional visual element
- **Content**: Title, description, key metrics, status
- **Actions**: Primary action button + secondary menu
- **Visuals**: Optional hero image or icon
- **Size**: Flexible height based on content

### Color Palette
```css
/* Module-specific colors */
--control-primary: #3b82f6;    /* Blue - Organizations */
--flow-primary: #10b981;       /* Green - Campaigns */
--signal-primary: #8b5cf6;     /* Purple - Governance */
--sense-primary: #f59e0b;      /* Orange - Identity */
--staking-primary: #ef4444;    /* Red - Staking */

/* Semantic colors */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### Typography Scale
```css
/* Heading scale */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
```

### Spacing System
```css
/* Consistent spacing scale */
--space-1: 0.25rem;     /* 4px */
--space-2: 0.5rem;      /* 8px */
--space-3: 0.75rem;     /* 12px */
--space-4: 1rem;        /* 16px */
--space-6: 1.5rem;      /* 24px */
--space-8: 2rem;        /* 32px */
--space-12: 3rem;       /* 48px */
--space-16: 4rem;       /* 64px */
```

## Data Layer Standards

### Hook Naming Conventions
- **Individual Entity**: `useOrganization(id)`, `useCampaign(id)`
- **Entity Lists**: `useOrganizations()`, `useCampaigns()`
- **Mutations**: `useCreateOrganization()`, `useUpdateCampaign()`
- **Actions**: `useVote()`, `useStake()`, `useDelegate()`

### GraphQL Conventions
```graphql
# Query naming
query GetOrganization($id: ID!) {
  organization(id: $id) {
    id
    name
    # ... fields
  }
}

# Mutation naming
mutation CreateOrganization($input: CreateOrganizationInput!) {
  createOrganization(input: $input) {
    id
    name
    # ... fields
  }
}
```

### IPFS Integration Standards

#### File Storage Patterns
- **Profile Avatars**: `/avatars/{address}/{filename}`
- **Organization Logos**: `/orgs/{orgId}/{filename}`
- **Campaign Media**: `/campaigns/{campaignId}/{filename}`
- **Proposal Documents**: `/proposals/{proposalId}/{filename}`

#### Metadata Standards
```typescript
interface IPFSMetadata {
  name: string
  description?: string
  image?: string          // IPFS hash
  external_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}
```

## Route Structure Standards

### URL Patterns
- **Module Overview**: `/{module}`
- **Entity List**: `/{module}/{entities}`
- **Entity Detail**: `/{module}/{entities}/{id}`
- **Entity Subpage**: `/{module}/{entities}/{id}/{subpage}`
- **Create Entity**: `/{module}/create`

### Examples
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
```

## State Management Patterns

### Loading States
```typescript
// Standard loading state pattern
interface LoadingState {
  isLoading: boolean
  isRefetching: boolean
  isLoadingMore: boolean
}

// Usage in components
if (isLoading) return <EntityCardSkeleton />
if (isRefetching) return <EntityCard data={data} loading />
```

### Error Handling
```typescript
// Standard error interface
interface ErrorState {
  error: Error | null
  retry: () => void
  dismiss: () => void
}

// Error boundary pattern
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component />
</ErrorBoundary>
```

## Performance Standards

### Bundle Size Targets
- **Initial Load**: <500KB gzipped
- **Route Chunks**: <100KB per route
- **Component Library**: <50KB for UI components
- **Individual Components**: <10KB each

### Loading Performance
- **Time to First Byte**: <800ms
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Time to Interactive**: <3s

## Accessibility Standards

### WCAG 2.1 Compliance
- **Level AA**: Minimum requirement for all components
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader**: Proper ARIA labels and descriptions
- **Focus Management**: Visible focus indicators

### Implementation Patterns
```typescript
// Accessible button pattern
<Button
  aria-label="Vote for proposal"
  aria-describedby="vote-description"
  disabled={!canVote}
>
  Vote For
</Button>

// Accessible form pattern
<Label htmlFor="organization-name">
  Organization Name
  <Input
    id="organization-name"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "name-error" : undefined}
  />
</Label>
```

## Testing Standards

### Test Coverage Targets
- **Components**: 80% coverage minimum
- **Hooks**: 90% coverage minimum
- **Utilities**: 95% coverage minimum
- **Critical Paths**: 100% coverage

### Testing Patterns
```typescript
// Component test pattern
describe('EntityCard', () => {
  it('renders entity data correctly', () => {
    render(<EntityCard entity={mockEntity} />)
    expect(screen.getByText(mockEntity.name)).toBeInTheDocument()
  })

  it('handles loading state', () => {
    render(<EntityCard entity={mockEntity} loading />)
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })
})

// Hook test pattern
describe('useEntity', () => {
  it('fetches entity data', async () => {
    const { result } = renderHook(() => useEntity('123'))
    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })
  })
})
```

## Implementation Learnings (Updated Throughout Development)

### Phase 1 Learnings
- [ ] Component architecture decisions
- [ ] Hook pattern refinements
- [ ] Performance optimizations discovered
- [ ] Accessibility improvements made
- [ ] Design system adjustments

### Common Patterns Discovered
- [ ] Reusable component patterns
- [ ] Effective hook combinations
- [ ] Performance optimization techniques
- [ ] Error handling improvements

### Gotchas & Solutions
- [ ] Common pitfalls and how to avoid them
- [ ] Browser-specific issues and fixes
- [ ] Performance bottlenecks and solutions
- [ ] Accessibility challenges and solutions

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Owner**: Frontend Development Team
**Status**: Living Document - Updated Continuously
**Next Review**: After each phase completion
