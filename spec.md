# CineRooms

## Current State
AdminContext.tsx has a triple-tap bootstrap flow (Effect 3) that first calls `actor.isCallerAdmin()` (from MixinAuthorization) before calling `actor.bootstrapAdminIfNeeded()`. The `isCallerAdmin()` mixin function returns `true` for all authenticated users, causing everyone who triple-taps to receive admin privileges.

## Requested Changes (Diff)

### Add
- Nothing new added

### Modify
- `AdminContext.tsx` Effect 3 (`checkAdminStatus`): Remove the `actor.isCallerAdmin()` call as the primary grant check. Replace with a flow that calls `actor.bootstrapAdminIfNeeded()` first, then `actor.isAdmin()` as a fallback for returning admins. Only grant admin if one of these returns `true`.

### Remove
- The `actor.isCallerAdmin()` call from the triple-tap bootstrap flow in Effect 3

## Implementation Plan
1. In AdminContext.tsx Effect 3's `checkAdminStatus`, restructure the logic:
   - Call `actor.bootstrapAdminIfNeeded()` first
   - If true → setIsAdmin(true) (covers: first bootstrap user, returning dynamic admin, hardcoded admin)
   - If false → call `actor.isAdmin()` as fallback
   - If both false → show restricted dialog
2. No backend changes needed — `bootstrapAdminIfNeeded` already enforces "first user only" correctly
