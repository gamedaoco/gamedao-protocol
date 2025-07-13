# Membership Filtering Fix

## Issue Description

Users were unable to create proposals even though they were members of various organizations. The issue was in the proposal creation page (`/signal/create`) which was trying to filter organizations incorrectly.

## Root Cause

The issue had multiple parts:

### 1. Wrong Query Data Access
The `useOrganizations` hook was accessing `userOrgsData?.organizations` but the `GET_USER_ORGANIZATIONS` query returns `members`:

```typescript
// ❌ INCORRECT - accessing wrong field
const userOrganizations = userOrgsData?.organizations

// ✅ CORRECT - accessing members field
const userOrganizations = userOrgsData?.members
```

### 2. Address Case Sensitivity
The query wasn't converting addresses to lowercase:

```typescript
// ❌ INCORRECT - case sensitive
variables: { user: address }

// ✅ CORRECT - lowercase for subgraph
variables: { user: address?.toLowerCase() || '' }
```

### 3. Missing State Filtering
The code wasn't filtering for active members only:

```typescript
// ✅ CORRECT - filter for active members
.filter((member: any) => member.state === 'ACTIVE')
```

## Solution

The fix was to use the existing `userOrganizations` data from the `useOrganizations` hook, which comes from the `GET_USER_ORGANIZATIONS` query:

```typescript
// ✅ CORRECT - use userOrganizations directly
const { userOrganizations, isUserOrgsLoading } = useOrganizations()

// No filtering needed - userOrganizations already contains only orgs where user is a member
if (userOrganizations.length === 0) {
  // Show empty state
}
```

## How Membership Data Works

1. **Subgraph Tracking**: The subgraph tracks membership through the `Member` entity
2. **Event-Based Updates**: When users join organizations, the `MemberAdded` event is emitted and indexed
3. **Query Structure**:
   - `GET_ORGANIZATIONS`: Returns all organizations (without member details)
   - `GET_USER_ORGANIZATIONS`: Returns organizations where the user is a member
   - `GET_ORGANIZATION_BY_ID`: Returns a specific organization with member details

## Files Changed

- `packages/frontend/src/app/signal/create/page.tsx`: Fixed membership filtering logic, removed unused `metadataURI` field, added proper UI state management
- `packages/frontend/src/hooks/useOrganizations.ts`: Fixed `GET_USER_ORGANIZATIONS` query data access and address lowercase conversion
- `packages/frontend/src/hooks/useProposalCreation.ts`: New hook for proposal creation with GAME token approval flow
- `packages/frontend/src/hooks/useProposals.ts`: Updated to properly handle transaction states and success/error feedback

## Testing

After the fix:
1. Users who are members of organizations can now see those organizations in the proposal creation dropdown
2. Users who are not members of any organizations see an appropriate empty state
3. The proposal creation form works correctly for organization members
4. **Proposal creation now follows the same UI pattern as organization creation**:
   - Shows GAME token approval progress
   - Displays transaction confirmation status
   - Provides proper error handling and retry functionality
   - Redirects to proposals list after successful creation

## No Database Reset Required

The issue was not with the database/subgraph data but with the frontend code incorrectly trying to access a field that wasn't included in the GraphQL query. No database reset is needed.
