# Security Specification - Mini Brawl Showdown

## Data Invariants
- A user's profile can only be read or written by the user themselves.
- Fields like `total`, `coins`, `gems`, etc., must be non-negative integers.
- `unlockingBrawler` must be a valid brawler ID string.

## The "Dirty Dozen" Payloads
1. **The Identity Thief**: Update another user's profile. (Expected: `PERMISSION_DENIED`)
2. **The Shadow Field**: Add a `isAdmin: true` field to the user profile. (Expected: `PERMISSION_DENIED`)
3. **The Negative Wallet**: Set `coins` to `-1000`. (Expected: `PERMISSION_DENIED`)
4. **The Giant ID**: Use a 2KB string as a user ID. (Expected: `PERMISSION_DENIED`)
5. **The Billionaire**: Set `gems` to `1000000000`. (Expected: `PERMISSION_DENIED`)
6. **The Unverified Update**: Update profile without a verified email (if required). (Expected: `PERMISSION_DENIED`)
7. **The Type Switch**: Change `claimedTiers` from an array to a string. (Expected: `PERMISSION_DENIED`)
8. **The Ghost Brawler**: Set `unlockingBrawler` to a 500-character random string. (Expected: `PERMISSION_DENIED`)
9. **The Time Traveler**: Set `lastDailyClaim` to a future timestamp manally. (Expected: `PERMISSION_DENIED`)
10. **The Orphaned Write**: Write to a path like `/users/shared/global`. (Expected: `PERMISSION_DENIED`)
11. **The Bulk Scraper**: Try to list all documents in the `users` collection. (Expected: `PERMISSION_DENIED`)
12. **The Immutable Warp**: Attempt to change a field that should be immutable (if any defined). (Expected: `PERMISSION_DENIED`)

## The Test Runner
(Tests will be logically verified in the rules)
