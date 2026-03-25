# Action Inventory – Page & Permission Spec

| Field | Value |
|-------|-------|
| **Version** | 1.1.0 |
| **Status** | 🟡 In Progress |
| **Last Updated** | 2026-03-20 |
| **Owner** | Product / Engineering |
| **Source** | Navigation map v1 (14 original + 26 suggested pages) |

---

## Purpose

This document is the single source of truth for every user-facing action across all application pages. Use it to:

- Define feature-flag / permission keys (`canEditFinancials`, `canDownloadDocs`)
- Drive role-based access control (RBAC) middleware and guards
- Generate UI copy, analytics event names, and automated test cases
- Track build status across the full page inventory

---

## Roles & Permissions Reference

| Role Constant | Display Name | Description |
|---------------|--------------|-------------|
| `ROLE_OWNER` | Owner | Full access. Created the organisation or property record. |
| `ROLE_ADMIN` | Admin | Tenant-level admin. Same rights as Owner within their scope. |
| `ROLE_MANAGER` | Manager | Can edit most records but cannot delete or manage billing. |
| `ROLE_VIEWER` | Viewer / Standard User | Read-only access. Can download but not create or edit. |
| `ROLE_ANY` | All authenticated users | Any logged-in user regardless of role. |

> **Shorthand used in tables below**
> - **Owner / Admin** → `ROLE_OWNER` or `ROLE_ADMIN`
> - **Standard User** → `ROLE_VIEWER`
> - **All** → `ROLE_ANY` (any authenticated user)

---

## Notation

| Symbol | Meaning |
|--------|---------|
| C | Create / Add |
| R | Read / View / Search / Filter |
| U | Update / Edit / Change / Reorder |
| D | Delete / Remove / Archive |
| E | Export / Download / Print |
| S | Share / Generate link / Invite |
| B | Bulk / Multi-select actions |
| O | Other / Misc (e.g., "Mark as favourite", "Pin", "Copy to clipboard") |

---

## Status Key

| Badge | Meaning |
|-------|---------|
| 🟢 | Built – shipped to production |
| 🟡 | In Progress – actively being developed |
| 🔴 | Not Started – on roadmap |
| ⚪ | Utility – no action inventory needed |

---

## Table of Contents

### 🔐 Auth

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | [LoginPage](#1-loginpagetsx) | `/login` | 🟢 |
| 2 | [RegisterPage](#2-registerpagetsx) | `/register` | 🟢 |
| 3 | [ForgotPasswordPage](#3-forgotpasswordpagetsx) | `/forgot-password` | 🟢 |
| 4 | [ResetPasswordPage](#4-resetpasswordpagetsx) | `/reset-password/:token` | 🟢 |
| 5 | [VerifyEmailPage](#5-verifyemailpagetsx) | `/verify-email/:token` | 🟢 |

### 👤 User & Account

| # | Page | Route | Status |
|---|------|-------|--------|
| 6 | [UserProfilePage](#6-userprofilepagetsx) | `/profile` | 🟢 |
| 7 | [AccountSettingsPage](#7-accountsettingspagetsx) | `/account-settings` | 🟢 |
| 8 | [TeamManagementPage](#8-teammanagementpagetsx) | `/team` | 🟡 |

### 🏠 Core App

| # | Page | Route | Status |
|---|------|-------|--------|
| 9 | [HomePage](#9-homepagetsx) | `/` | 🟢 |
| 10 | [PortfolioPage](#10-portfoliopagetsx) | `/portfolio` | 🟢 |
| 11 | [AddPropertyPage](#11-addpropertypagetsx) | `/property/add` | 🟢 |
| 12 | [AnalyticsPage](#12-analyticspagetsx) | `/analytics` | 🟡 |
| 13 | [MapPage](#13-mappagetsx) | `/map` | 🟡 |
| 15 | [SuccessionPage](#15-successionpagetsx) | `/succession` | 🔴 |
| 16 | [SettingsPage](#16-settingspagetsx) | `/settings` | 🟢 |

### 🏢 Property Detail

| # | Page | Route | Status |
|---|------|-------|--------|
| 17 | [PropertyOverviewRedirect](#17-propertyoverviewredirecttsx) | `/property/:id` | 🟢 |
| 14 | [PropertySpatialPage](#14-propertyspatialpagetsx) | `/property/:id/spatial` | 🟡 |
| 18 | [PropertyDocumentsPage](#18-propertydocumentspagetsx) | `/property/:id/documents` | 🟢 |
| 19 | [PropertyOwnershipPage](#19-propertyownershippagetsx) | `/property/:id/ownership` | 🟡 |
| 20 | [PropertyRentalPage](#20-propertyrentalpagetsx) | `/property/:id/rental` | 🟢 |
| 21 | [PropertySafetyPage](#21-propertysafetypagetsx) | `/property/:id/safety` | 🔴 |
| 22 | [PropertyValuationPage](#22-propertyvaluationpagetsx) | `/property/:id/valuation` | 🟡 |
| 23 | [PropertyFinancialsPage](#23-propertyfinancialspagetsx) | `/property/:id/financials` | 🟡 |
| 24 | [PropertyTenantsPage](#24-propertytenantspagetsx) | `/property/:id/tenants` | 🟢 |
| 25 | [PropertyMaintenancePage](#25-propertymaintenancepagetsx) | `/property/:id/maintenance` | 🟡 |
| 26 | [PropertyInspectionsPage](#26-propertyinspectionspagetsx) | `/property/:id/inspections` | 🔴 |
| 27 | [PropertyLeaseAgreementsPage](#27-propertyleaseagreementspagetsx) | `/property/:id/leases` | 🟡 |
| 28 | [PropertyPhotosPage](#28-propertyphotospagetsx) | `/property/:id/photos` | 🟢 |
| 29 | [PropertyNotesPage](#29-propertynotespagetsx) | `/property/:id/notes` | 🟢 |

### 🛠 Admin

| # | Page | Route | Status |
|---|------|-------|--------|
| 30 | [AdminDashboardPage](#30-admindashboardpagetsx) | `/admin` | 🟡 |
| 31 | [AuditLogPage](#31-auditlogpagetsx) | `/admin/audit-log` | 🔴 |
| 32 | [FeatureFlagsPage](#32-featureflagspagetsx) | `/admin/feature-flags` | 🔴 |

### 💳 Billing & Integrations

| # | Page | Route | Status |
|---|------|-------|--------|
| 33 | [BillingPage](#33-billingpagetsx) | `/billing` | 🟡 |
| 34 | [IntegrationsPage](#34-integrationspagetsx) | `/integrations` | 🔴 |

### ❓ Help & System

| # | Page | Route | Status |
|---|------|-------|--------|
| 35 | [HelpCenterPage](#35-helpcenterpagetsx) | `/help` | 🟡 |
| 36 | [ContactSupportPage](#36-contactsupportpagetsx) | `/support` | 🟡 |
| 37 | [ChangelogPage](#37-changelogpagetsx) | `/changelog` | 🟢 |
| 38 | [NotFoundPage](#38-notfoundpagetsx) | `*` | 🟢 |
| 39 | [UnauthorizedPage](#39-unauthorizedpagetsx) | `/403` | 🟢 |
| 40 | [MaintenanceModePage](#40-maintenancemodepagetsx) | `/maintenance` | ⚪ |

---

## Action Inventory – Per Page

---

## 🔐 Auth

---

### 1. `LoginPage.tsx`

**Route:** `/login` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | Enter credentials | *(public)* | Fill email & password fields |
| All | C | Submit login | *(public)* | Click Log In button |
| All | R | View error messages | *(public)* | Show validation / auth error |
| All | R | Navigate to "Forgot password" | *(public)* | Click link |
| All | R | Navigate to "Register" | *(public)* | Click link |
| All | R | Trigger SSO | *(public)* | Click "Sign in with \<provider\>" |

> **Notes / Edge Cases**
> - Redirect to `/` (or last visited route) on successful login.
> - Lock account after N failed attempts (configurable via `loginLockoutEnabled` flag).
> - SSO button should only render if `ssoEnabled` feature flag is on.

---

### 2. `RegisterPage.tsx`

**Route:** `/register` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | C | Fill registration form | *(public)* | Name, email, password, optional invite code |
| All | C | Submit registration | *(public)* | |
| All | R | View validation errors | *(public)* | Inline field-level errors |
| All | R | Navigate to "Login" | *(public)* | |
| All | R | Trigger email verification flow | *(public)* | Auto-sends verification email on success |

> **Notes / Edge Cases**
> - Invite-code field only renders if `inviteOnlyRegistration` flag is on.
> - If invite code is present in URL param, pre-fill and lock the field.

---

### 3. `ForgotPasswordPage.tsx`

**Route:** `/forgot-password` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | C | Enter email | *(public)* | |
| All | C | Request reset link | *(public)* | Rate-limited to prevent abuse |
| All | R | See success / error toast | *(public)* | Always show success copy (avoid email enumeration) |
| All | R | Navigate back to login | *(public)* | |

> **Notes / Edge Cases**
> - Always show a success message regardless of whether the email exists (security best practice).
> - Reset link expires after 1 hour.

---

### 4. `ResetPasswordPage.tsx`

**Route:** `/reset-password/:token` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | C | Enter new password + confirm | *(public)* | |
| All | C | Submit | *(public)* | Invalidates token on success |
| All | R | Show password-strength indicator | *(public)* | |
| All | R | Redirect to login after success | *(public)* | |

> **Notes / Edge Cases**
> - Validate token server-side before rendering form; show "link expired" state if invalid.
> - Tokens are single-use.

---

### 5. `VerifyEmailPage.tsx`

**Route:** `/verify-email/:token` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | Show verification status | *(public)* | Success or failure state |
| All | C | Resend verification email | *(public)* | Only shown on failure |
| All | R | Redirect to login / home | *(public)* | After successful verification |

> **Notes / Edge Cases**
> - Rate-limit resend to 3 times per hour per email.

---

## 👤 User & Account

---

### 6. `UserProfilePage.tsx`

**Route:** `/profile` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Owner / Admin | U | Edit personal info | `canEditOwnProfile` | Name, phone, avatar |
| Owner / Admin | U | Change profile picture | `canEditOwnProfile` | Upload / crop |
| Owner / Admin | U | Set time-zone / language | `canEditOwnProfile` | |
| Owner / Admin | C | Add secondary email | `canEditOwnProfile` | |
| Owner / Admin | D | Remove secondary email | `canEditOwnProfile` | |
| Owner / Admin | E | Download personal data | `canExportPersonalData` | GDPR export |
| Standard User | R | View own profile | *(default)* | Read-only |
| All | S | Copy profile link | `canShareProfile` | Only if public profiles are enabled |

> **Notes / Edge Cases**
> - GDPR export is async — queue a job and email the user a download link.
> - Profile picture upload should enforce max 5 MB, JPG/PNG only.

---

### 7. `AccountSettingsPage.tsx`

**Route:** `/account-settings` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Owner / Admin | U | Change password | `canChangePassword` | Requires current password confirmation |
| Owner / Admin | U | Enable / disable MFA | `canManageMFA` | TOTP or SMS |
| Owner / Admin | U | Configure notification preferences | `canManageNotifications` | Email, Slack, SMS |
| Owner / Admin | U | Set default dashboard / landing page | `canEditOwnProfile` | |
| Owner / Admin | D | Delete account | `canDeleteOwnAccount` | Hard delete with 30-day grace period |
| Owner / Admin | E | Export account activity log | `canExportPersonalData` | |
| Standard User | R | View current settings | *(default)* | Read-only |

> **Notes / Edge Cases**
> - Account deletion should trigger a confirmation modal + secondary email confirmation.
> - MFA disable requires re-authentication.

---

### 8. `TeamManagementPage.tsx`

**Route:** `/team` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Owner / Admin | C | Invite new member | `canInviteTeamMembers` | Email invite with role selection |
| Owner / Admin | U | Edit member role | `canManageTeamRoles` | Owner, Manager, Viewer |
| Owner / Admin | D | Remove member | `canRemoveTeamMembers` | Revokes all access |
| Owner / Admin | B | Bulk-invite | `canInviteTeamMembers` | CSV upload |
| Owner / Admin | R | Search / filter members | *(default)* | |
| Owner / Admin | E | Export team list | `canExportTeamData` | CSV/Excel |
| Owner / Admin | S | Generate temporary access link | `canGenerateAccessLinks` | Time-limited invite URL |
| Standard User | R | View own membership details | *(default)* | |

> **Notes / Edge Cases**
> - Owner cannot remove themselves if they are the sole owner.
> - CSV bulk-invite should validate emails and report errors per row.

---

## 🏠 Core App

---

### 9. `HomePage.tsx`

**Route:** `/` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View key metrics cards | *(default)* | Total properties, cash-flow, alerts |
| All | R | Refresh widgets | *(default)* | Auto-refresh or manual |
| All | R | Navigate to any property | *(default)* | Click tile |
| All | R | Open quick-add widget | *(default)* | "New Property" shortcut |
| All | R | Open recent activity feed | *(default)* | |
| All | E | Export dashboard as PDF | `canExportDashboard` | |
| All | S | Share a snapshot link | `canShareDashboard` | Read-only snapshot URL |
| Owner / Admin | U | Customize dashboard layout | `canCustomizeDashboard` | Drag-drop widgets |
| Owner / Admin | C | Create a new custom widget | `canCustomizeDashboard` | e.g., "My favourite properties" |

> **Notes / Edge Cases**
> - Dashboard layout is persisted per user (not per role).
> - Snapshot links should expire after 7 days by default.

---

### 10. `PortfolioPage.tsx`

**Route:** `/portfolio` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View list or grid of properties | *(default)* | |
| All | R | Sort by name, value, status, last activity | *(default)* | |
| All | R | Filter by location, asset class, owner, tags | *(default)* | |
| All | R | Search by address / ID | *(default)* | |
| All | U | Inline edit quick fields | `canEditPropertyMeta` | e.g., label, status |
| All | C | Open Property Overview | *(default)* | Navigate to `/property/:id` |
| All | B | Bulk-select properties | *(default)* | Activates bulk action toolbar |
| Owner / Admin | D | Bulk-archive / bulk-delete | `canDeleteProperties` | With confirmation modal |
| Owner / Admin | C | Bulk-assign tags or owners | `canEditPropertyMeta` | |
| Owner / Admin | E | Export selected or all rows | `canExportPortfolio` | CSV/Excel |
| Owner / Admin | S | Generate shareable filtered view link | `canSharePortfolio` | Encodes current filters in URL |
| All | R | Open "Add New Property" FAB | `canAddProperty` | Calls `AddPropertyPage` |

> **Notes / Edge Cases**
> - Grid vs list preference persisted in user settings.
> - Bulk delete requires typing "DELETE" in a confirmation input for irreversible action.

---

### 11. `AddPropertyPage.tsx`

**Route:** `/property/add` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Owner / Admin | C | Enter basic property details | `canAddProperty` | Address, type, size, description |
| Owner / Admin | C | Upload initial documents & photos | `canAddProperty` | |
| Owner / Admin | C | Assign owners / managers | `canAddProperty` | |
| Owner / Admin | C | Set initial valuation | `canAddProperty` | |
| Owner / Admin | C | Configure default tabs | `canAddProperty` | Enable/disable modules (e.g., rental) |
| Owner / Admin | C | Save draft | `canAddProperty` | Returns to draft on next visit |
| Owner / Admin | C | Submit (create) | `canAddProperty` | |
| Owner / Admin | R | View validation errors | *(default)* | |
| Owner / Admin | U | Edit any field before final submit | `canAddProperty` | |
| Owner / Admin | E | Export filled-out form as PDF | `canExportPropertyData` | For offline record |

> **Notes / Edge Cases**
> - Address field should trigger geocoding to pre-populate map pin.
> - Draft auto-saves every 30 seconds.

---

### 12. `AnalyticsPage.tsx`

**Route:** `/analytics` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | Select date range | *(default)* | Pre-set or custom |
| All | R | Choose report type | *(default)* | Revenue, Occupancy, Maintenance costs, etc. |
| All | R | Apply filters | *(default)* | By property, asset class, region |
| All | R | Toggle chart types | *(default)* | Line, bar, heatmap |
| All | E | Export chart data | `canExportAnalytics` | CSV/Excel |
| All | E | Download chart as image | `canExportAnalytics` | PNG, SVG |
| All | S | Generate shareable link | `canShareAnalytics` | Encodes current filter state |
| Owner / Admin | C | Save custom report view | `canManageReports` | |
| Owner / Admin | U | Rename / delete saved reports | `canManageReports` | |
| Owner / Admin | B | Select multiple metrics for combined view | `canManageReports` | |
| All | R | Refresh data | *(default)* | Manual reload button |

> **Notes / Edge Cases**
> - Charts must handle empty-state gracefully (no data for selected range).
> - Saved reports are scoped to the user, not the organisation.

---

### 13. `MapPage.tsx`

**Route:** `/map` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | Pan / zoom | *(default)* | Mouse, touch, UI buttons |
| All | R | Toggle base layers | *(default)* | Satellite, street, terrain |
| All | R | Toggle overlay layers | *(default)* | Property pins, heat-maps, zoning |
| All | R | Click a pin → open quick-view tooltip | *(default)* | |
| All | C | Navigate to full Property Detail from tooltip | *(default)* | |
| All | R | Search address / coordinates | *(default)* | |
| All | U | Draw rectangle / polygon to filter | *(default)* | Spatial query on visible properties |
| All | E | Export current map view as PNG / PDF | `canExportMap` | |
| Owner / Admin | C | Add a new custom marker | `canManageMapMarkers` | e.g., "New construction site" |
| Owner / Admin | U | Edit or delete custom marker | `canManageMapMarkers` | |
| Owner / Admin | B | Bulk-delete selected markers | `canManageMapMarkers` | |

> **Notes / Edge Cases**
> - Map tile provider should be configurable (Mapbox, Google, OSM).
> - Drawing tool should be disabled on mobile if viewport is too small.

---

### 15. `SuccessionPage.tsx`

**Route:** `/succession` | **Status:** 🔴 Not Started

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Owner / Admin | R | View current succession plan hierarchy | `canViewSuccession` | |
| Owner / Admin | C | Add a successor | `canManageSuccession` | Person, entity, percentage |
| Owner / Admin | U | Edit successor details | `canManageSuccession` | Share %, conditions |
| Owner / Admin | D | Remove successor | `canManageSuccession` | |
| Owner / Admin | B | Bulk-assign successors to multiple properties | `canManageSuccession` | |
| Owner / Admin | E | Export succession plan | `canExportSuccession` | PDF/Excel |
| Owner / Admin | S | Generate secure share link for legal counsel | `canShareSuccession` | Password-protected |
| All | R | Download succession summary for single property | `canViewSuccession` | |

> **Notes / Edge Cases**
> - Percentages across all successors must sum to 100% — enforce on save.
> - Legal share links should be time-limited and require a PIN to open.

---

### 16. `SettingsPage.tsx`

**Route:** `/settings` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Owner / Admin | U | Toggle global feature flags | `canManageFeatureFlags` | If exposed to tenant admins |
| Owner / Admin | U | Set default currency, measurement units | `canManageOrgSettings` | |
| Owner / Admin | U | Configure API keys / webhooks | `canManageIntegrations` | |
| Owner / Admin | U | Upload company logo / branding assets | `canManageOrgSettings` | |
| Owner / Admin | E | Export current settings | `canExportSettings` | JSON |
| Owner / Admin | C | Add a new custom setting | `canManageOrgSettings` | Key/value pair |
| Owner / Admin | D | Delete a custom setting | `canManageOrgSettings` | |
| All | R | View current settings | *(default)* | Read-only for non-admin |

> **Notes / Edge Cases**
> - API key values should be masked on load; require re-authentication to reveal.
> - Logo uploads should be optimised on the server side (max 2 MB, SVG/PNG).

---

## 🏢 Property Detail

---

### 17. `PropertyOverviewRedirect.tsx`

**Route:** `/property/:id` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | Auto-redirect to default tab | *(default)* | e.g., Overview, Documents, Financials |
| All | U | Change default tab | `canEditOwnProfile` | Via gear icon on tab bar |
| All | R | Fallback to "Overview" if default tab is unavailable | *(default)* | Permission-based fallback |

> **Notes / Edge Cases**
> - Default tab preference is stored per user per property.
> - If a property ID does not exist, redirect to `/404`.

---

### 14. `PropertySpatialPage.tsx`

**Route:** `/property/:id/spatial` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View property-level GIS layers | `canViewSpatial` | Parcel, flood zone, zoning |
| All | R | Toggle layers | `canViewSpatial` | Buildings, utilities, terrain |
| All | U | Measure distance / area | `canViewSpatial` | Draw tool |
| All | R | Click a feature → show attribute popup | `canViewSpatial` | |
| All | E | Export map (current view) as PNG / PDF | `canExportMap` | |
| All | S | Copy shareable link encoding current view | `canShareSpatial` | |
| Owner / Admin | C | Add a custom annotation or geo-feature | `canManageSpatialAnnotations` | |
| Owner / Admin | U | Edit custom annotation | `canManageSpatialAnnotations` | |
| Owner / Admin | D | Delete custom annotation | `canManageSpatialAnnotations` | |
| Owner / Admin | B | Bulk-delete selected custom features | `canManageSpatialAnnotations` | |

> **Notes / Edge Cases**
> - GIS data may be sourced from a third-party (e.g., Esri, Mapbox). Handle API quota limits gracefully.
> - Annotations are property-scoped, not user-scoped.

---

### 18. `PropertyDocumentsPage.tsx`

**Route:** `/property/:id/documents` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | List documents with thumbnails, type, date | `canViewDocuments` | |
| All | R | Search / filter by type, tag, date | `canViewDocuments` | |
| All | R | Sort (name, date, size) | `canViewDocuments` | |
| All | C | Upload a new document | `canUploadDocuments` | Drag-drop or browse |
| All | U | Rename a document | `canEditDocuments` | |
| All | U | Add / edit tags / categories | `canEditDocuments` | |
| All | D | Delete a document | `canDeleteDocuments` | Soft-delete with recycle bin |
| All | E | Download a single document | `canDownloadDocuments` | |
| All | B | Bulk download (ZIP) or bulk delete | `canDownloadDocuments` | |
| All | S | Generate shareable read-only link | `canShareDocuments` | For a document or folder |
| All | C | Create a new folder | `canUploadDocuments` | |
| All | U | Rename / move folder | `canEditDocuments` | |
| All | D | Delete folder | `canDeleteDocuments` | Cascades to contained docs |
| All | E | Export document list | `canExportPortfolio` | CSV |
| All | O | Mark document as "Important" | `canEditDocuments` | Star flag |
| Owner / Admin | U | Set document permissions | `canManageDocumentPermissions` | Who can view / edit |
| Owner / Admin | C | Add a version comment | `canEditDocuments` | When uploading a new version |

> **Notes / Edge Cases**
> - Recycle bin retains soft-deleted docs for 30 days then hard-deletes.
> - Shareable links should allow optional password protection and expiry date.
> - Versioning: each upload to the same filename creates a new version, not an overwrite.

---

### 19. `PropertyOwnershipPage.tsx`

**Route:** `/property/:id/ownership` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View ownership tree | `canViewOwnership` | Percentage, entity, start/end dates |
| All | R | Download ownership report | `canExportOwnership` | PDF/Excel |
| Owner / Admin | C | Add a new owner / stakeholder | `canManageOwnership` | |
| Owner / Admin | U | Edit owner details | `canManageOwnership` | Percentage, contact info |
| Owner / Admin | D | Remove an owner | `canManageOwnership` | |
| Owner / Admin | B | Bulk-update percentages for multiple owners | `canManageOwnership` | |
| Owner / Admin | S | Generate shareable snapshot of ownership tree | `canShareOwnership` | |
| Owner / Admin | U | Assign roles | `canManageOwnership` | e.g., "Managing Owner", "Beneficial Owner" |
| All | O | Highlight the "controlling owner" | *(default)* | Visual cue only |

> **Notes / Edge Cases**
> - Total ownership percentages must always equal 100% — validate on save.
> - Ownership history (past owners) should be preserved with date ranges, not deleted.

---

### 20. `PropertyRentalPage.tsx`

**Route:** `/property/:id/rental` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View current lease summary | `canViewRental` | Tenant name, lease term, rent amount |
| All | R | See rent roll table | `canViewRental` | All units, status |
| All | R | Filter by lease status | `canViewRental` | Active, expired, pending |
| All | R | Export rent roll | `canExportRental` | CSV/Excel |
| Owner / Admin | C | Create a new lease | `canManageLeases` | Multi-step wizard |
| Owner / Admin | U | Edit lease details | `canManageLeases` | Rent amount, dates, clauses |
| Owner / Admin | D | Terminate / delete a lease | `canDeleteLeases` | With full audit trail |
| Owner / Admin | B | Bulk-increase rent by % | `canManageLeases` | Apply to selected units |
| Owner / Admin | E | Generate rent invoice PDF for a unit | `canExportRental` | |
| Owner / Admin | S | Send lease or invoice link to tenant | `canContactTenants` | Email/SMS |
| All | O | Mark a lease as "Renewal pending" | `canEditRentalMeta` | Badge |
| Owner / Admin | U | Add payment history entry | `canManagePayments` | Manual entry |
| All | R | View payment timeline chart | `canViewRental` | |
| Owner / Admin | C | Add a new payment schedule | `canManagePayments` | e.g., monthly, quarterly |

> **Notes / Edge Cases**
> - Terminated leases must not be hard-deleted; mark as `status: terminated` for audit purposes.
> - Bulk rent increase should require a preview step showing all affected units before confirmation.

---

### 21. `PropertySafetyPage.tsx`

**Route:** `/property/:id/safety` | **Status:** 🔴 Not Started

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View safety/compliance status overview | `canViewSafety` | Certificates, inspections, incidents |
| All | R | Download safety audit PDF | `canExportSafety` | |
| Owner / Admin | C | Add a new safety document | `canManageSafety` | e.g., fire-extinguisher certificate |
| Owner / Admin | U | Edit document metadata | `canManageSafety` | Expiry date, regulator |
| Owner / Admin | D | Delete a safety record | `canDeleteSafety` | |
| Owner / Admin | C | Log a safety incident | `canManageSafety` | Date, description, severity |
| Owner / Admin | U | Update incident status | `canManageSafety` | Open, under review, resolved |
| Owner / Admin | B | Bulk-mark incidents as resolved | `canManageSafety` | |
| All | E | Export incident log | `canExportSafety` | CSV |
| All | S | Share compliance status with external auditor | `canShareSafety` | Secure time-limited link |
| Owner / Admin | U | Set reminders for upcoming expirations | `canManageSafety` | Email/SMS |
| All | O | Toggle "Show only non-compliant items" filter | *(default)* | |

> **Notes / Edge Cases**
> - Expiry reminders should trigger at 90, 30, and 7 days before expiry.
> - Incident severity levels: Low / Medium / High / Critical — map to colour badges.

---

### 22. `PropertyValuationPage.tsx`

**Route:** `/property/:id/valuation` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View valuation history chart | `canViewValuation` | Date vs. value |
| All | R | See latest appraisal report | `canViewValuation` | PDF viewer |
| All | R | Filter by appraisal source | `canViewValuation` | Internal, external |
| All | E | Download valuation table | `canExportValuation` | CSV/Excel |
| Owner / Admin | C | Add a new valuation entry | `canManageValuation` | Manual or upload appraisal PDF |
| Owner / Admin | U | Edit valuation metadata | `canManageValuation` | Value, date, source |
| Owner / Admin | D | Delete a valuation entry | `canDeleteValuation` | |
| Owner / Admin | S | Share valuation report with a stakeholder | `canShareValuation` | |
| All | O | Mark a valuation as "Verified" | `canEditValuationMeta` | Badge |
| Owner / Admin | U | Set a target valuation | `canManageValuation` | For planning / forecasting |
| All | R | Compare multiple properties side-by-side | `canViewValuation` | Select from portfolio |

> **Notes / Edge Cases**
> - Chart should display an interpolated trend line, not just raw data points.
> - "Verified" badge should record who verified and when (shown in a tooltip).

---

### 23. `PropertyFinancialsPage.tsx`

**Route:** `/property/:id/financials` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View income statement, expense breakdown, cash-flow chart | `canViewFinancials` | |
| All | R | Select fiscal year / quarter | `canViewFinancials` | |
| All | R | Apply filters | `canViewFinancials` | By category, vendor, project |
| All | E | Export financials | `canExportFinancials` | CSV, Excel, PDF |
| Owner / Admin | C | Add a new expense transaction | `canManageFinancials` | |
| Owner / Admin | U | Edit an existing transaction | `canManageFinancials` | |
| Owner / Admin | D | Delete a transaction | `canDeleteFinancials` | Soft-delete |
| Owner / Admin | B | Bulk-assign category to selected transactions | `canManageFinancials` | |
| Owner / Admin | C | Upload a bank statement (auto-import) | `canManageFinancials` | CSV/OFX parsing |
| Owner / Admin | U | Map imported rows to chart of accounts | `canManageFinancials` | |
| Owner / Admin | S | Share a financial snapshot with accountant | `canShareFinancials` | |
| Owner / Admin | O | Mark a transaction as "Recurring" | `canManageFinancials` | Auto-generates future entries |
| All | R | Toggle between "Actual" vs. "Projected" data | `canViewFinancials` | |
| All | R | Drill-down from chart to underlying ledger entries | `canViewFinancials` | |

> **Notes / Edge Cases**
> - Deleted transactions should be retained in an audit ledger (never hard-deleted).
> - Bank statement auto-import should handle duplicate detection (match on date + amount + description).
> - Projected data is read from a separate `projections` table — clearly distinguish in the UI.

---

### 24. `PropertyTenantsPage.tsx`

**Route:** `/property/:id/tenants` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | List current & historic tenants | `canViewTenants` | Name, unit, lease dates |
| All | R | Search / filter by name, unit, lease status | `canViewTenants` | |
| All | R | View tenant contact details | `canViewTenantContacts` | May be restricted for GDPR |
| All | E | Export tenant list | `canExportTenants` | CSV/Excel |
| Owner / Admin | C | Add a new tenant | `canManageTenants` | Creates lease simultaneously |
| Owner / Admin | U | Edit tenant info | `canManageTenants` | Phone, email |
| Owner / Admin | U | Update lease terms | `canManageLeases` | |
| Owner / Admin | D | Terminate lease / remove tenant | `canDeleteLeases` | |
| Owner / Admin | B | Bulk-send renewal notices | `canContactTenants` | Email/SMS |
| Owner / Admin | S | Generate secure link for tenant portal | `canManageTenants` | |
| All | O | Mark tenant as "VIP" | `canEditTenantMeta` | Star flag |
| Owner / Admin | C | Log a tenant incident | `canManageTenants` | Damage, complaint |
| Owner / Admin | U | Update incident status | `canManageTenants` | |
| All | R | View tenant payment history | `canViewRental` | Linked from Rental page |

> **Notes / Edge Cases**
> - Tenant contact details (phone, email) should only be visible to `ROLE_MANAGER` and above if GDPR restrictions are enabled via `tenantContactPrivacy` flag.
> - Historic tenants (past leases) should be read-only.

---

### 25. `PropertyMaintenancePage.tsx`

**Route:** `/property/:id/maintenance` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View maintenance request list | `canViewMaintenance` | Open, in-progress, closed |
| All | R | Filter by status, priority, category, vendor | `canViewMaintenance` | |
| All | R | Search by keyword | `canViewMaintenance` | |
| All | E | Export request list | `canExportMaintenance` | CSV/Excel |
| All | C | Create a new work order | `canCreateWorkOrders` | Title, description, priority, vendor |
| All | U | Edit a work order | `canEditWorkOrders` | Change description, due date |
| All | U | Add comments / attachments | `canEditWorkOrders` | |
| All | D | Delete a work order | `canDeleteWorkOrders` | Only while in "draft" status |
| All | B | Bulk-change status or assign vendor | `canEditWorkOrders` | |
| All | S | Share work order link with contractor | `canShareMaintenance` | |
| Owner / Admin | U | Mark work order as "Urgent" | `canManageMaintenance` | Badge |
| All | O | Toggle "Show only overdue" filter | *(default)* | |
| All | R | View timeline / Gantt chart | `canViewMaintenance` | |
| All | C | Schedule a preventive maintenance task | `canCreateWorkOrders` | Recurring |
| All | U | Mark task as completed and upload invoice | `canEditWorkOrders` | |
| All | E | Download completed-task report | `canExportMaintenance` | PDF |

> **Notes / Edge Cases**
> - Work orders in non-draft status cannot be deleted; they can only be cancelled (status change).
> - Contractor share links should be read-only and must not expose internal cost data.

---

### 26. `PropertyInspectionsPage.tsx`

**Route:** `/property/:id/inspections` | **Status:** 🔴 Not Started

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | List past inspections | `canViewInspections` | Date, inspector, status |
| All | R | Filter by type | `canViewInspections` | Annual, fire, structural |
| All | R | Search by inspector name | `canViewInspections` | |
| All | C | Schedule a new inspection | `canManageInspections` | Date, type, assign inspector |
| All | U | Edit scheduled inspection | `canManageInspections` | |
| All | D | Cancel a scheduled inspection | `canManageInspections` | |
| All | C | Upload inspection report | `canManageInspections` | PDF, images |
| All | U | Add / edit checklist items | `canManageInspections` | |
| All | D | Delete a report | `canDeleteInspections` | |
| All | E | Export inspection summary | `canExportInspections` | CSV/Excel |
| All | S | Share inspection report with stakeholder | `canShareInspections` | |
| All | O | Mark an inspection as "Pass" / "Fail" | `canManageInspections` | Badge |
| All | B | Bulk-download selected reports as ZIP | `canExportInspections` | |
| All | R | View trend chart of inspection scores over time | `canViewInspections` | |

> **Notes / Edge Cases**
> - Cancelled inspections should be retained in history with `status: cancelled`.
> - Checklist items should be templatable — allow saving and reusing checklist templates.

---

### 27. `PropertyLeaseAgreementsPage.tsx`

**Route:** `/property/:id/leases` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | List lease agreements | `canViewLeases` | Active, expired, draft |
| All | R | Search / filter by tenant, date, status | `canViewLeases` | |
| All | C | Upload a signed lease PDF | `canUploadLeases` | |
| All | U | Replace/renew lease document | `canEditLeases` | |
| All | D | Delete a lease document | `canDeleteLeases` | Soft delete |
| All | E | Download lease PDF | `canDownloadLeases` | |
| All | B | Bulk-download selected leases as ZIP | `canDownloadLeases` | |
| Owner / Admin | C | Create a lease from template | `canManageLeases` | Multi-step wizard |
| Owner / Admin | U | Edit lease terms before signing | `canManageLeases` | Rent, duration |
| Owner / Admin | S | Send lease signing request via e-signature | `canManageLeases` | Requires e-signature integration |
| Owner / Admin | U | Set reminder for lease expiration | `canManageLeases` | |
| All | O | Mark lease as "Auto-renew" | `canEditLeaseMeta` | |
| All | R | View lease audit trail | `canViewLeases` | Who edited, when |

> **Notes / Edge Cases**
> - E-signature integration (e.g., DocuSign, HelloSign) must be enabled via `eSignatureEnabled` flag.
> - Soft-deleted leases are recoverable for 30 days.
> - Auto-renew flag should trigger a notification N days before expiry (configurable).

---

### 28. `PropertyPhotosPage.tsx`

**Route:** `/property/:id/photos` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | Gallery view of property photos / floor plans | `canViewPhotos` | |
| All | R | Zoom / fullscreen | `canViewPhotos` | |
| All | C | Upload new photos | `canUploadPhotos` | Drag-drop, multi-select |
| All | U | Edit photo metadata | `canEditPhotos` | Caption, tags, date taken |
| All | U | Rotate / crop | `canEditPhotos` | |
| All | D | Delete photo | `canDeletePhotos` | |
| All | B | Select multiple → bulk delete / bulk tag | `canEditPhotos` | |
| All | E | Download single photo (original size) or set as ZIP | `canDownloadPhotos` | |
| All | S | Generate shareable link | `canSharePhotos` | Public or password-protected |
| Owner / Admin | C | Create albums / groupings | `canManageAlbums` | |
| Owner / Admin | U | Rename / reorder albums | `canManageAlbums` | |
| All | O | Mark photo as "Cover image" | `canEditPhotos` | One cover per property |

> **Notes / Edge Cases**
> - Accept JPG, PNG, HEIC, WebP. Convert HEIC to JPG server-side.
> - Max upload size: 20 MB per file, 100 files per batch.
> - Cover image change should propagate to `PortfolioPage` tiles within a short cache window.

---

### 29. `PropertyNotesPage.tsx`

**Route:** `/property/:id/notes` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | List chronological notes | `canViewNotes` | Author, timestamp |
| All | C | Add a new note | `canAddNotes` | Rich-text editor |
| All | U | Edit own note | `canEditOwnNotes` | |
| All | D | Delete own note | `canDeleteOwnNotes` | |
| Owner / Admin | U | Edit any note | `canEditAllNotes` | |
| Owner / Admin | D | Delete any note | `canDeleteAllNotes` | |
| All | B | Select multiple notes → bulk delete | `canDeleteOwnNotes` | |
| All | E | Export notes | `canExportNotes` | PDF/Markdown/CSV |
| All | S | Share a note via link or email | `canShareNotes` | |
| All | O | Pin a note | `canEditOwnNotes` | Pinned notes appear at top |
| All | R | Search notes (full-text) | `canViewNotes` | |
| All | R | Filter by tags / categories | `canViewNotes` | |

> **Notes / Edge Cases**
> - Rich-text editor should support: bold, italic, bullet lists, inline images, @mentions.
> - Pinned notes: max 3 pinned per property to prevent clutter.

---

## 🛠 Admin

---

### 30. `AdminDashboardPage.tsx`

**Route:** `/admin` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Admin | R | View system health metrics | `canAccessAdmin` | CPU, memory, request latency |
| Admin | R | View user statistics | `canAccessAdmin` | Total users, active sessions, new sign-ups |
| Admin | R | View error / exception log summary | `canAccessAdmin` | Link to full logs |
| Admin | R | View storage usage | `canAccessAdmin` | Per-tenant storage consumption |
| Admin | U | Impersonate a user | `canImpersonateUsers` | For support purposes; fully audited |
| Admin | U | Suspend / reactivate a user account | `canManageUsers` | |
| Admin | E | Export user list | `canManageUsers` | CSV |
| Admin | R | View recent audit log entries | `canViewAuditLog` | Last 50 events inline |
| Admin | R | Navigate to full Audit Log | `canViewAuditLog` | Link to `/admin/audit-log` |

> **Notes / Edge Cases**
> - Impersonation must be logged in the audit trail with the impersonator's ID.
> - Admin pages must redirect non-admin users to `/403`.

---

### 31. `AuditLogPage.tsx`

**Route:** `/admin/audit-log` | **Status:** 🔴 Not Started

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Admin | R | View full audit log | `canViewAuditLog` | All user & system events |
| Admin | R | Filter by user, action type, date range, resource | `canViewAuditLog` | |
| Admin | R | Search by keyword | `canViewAuditLog` | |
| Admin | R | Expand log entry to see full payload / diff | `canViewAuditLog` | |
| Admin | E | Export audit log | `canExportAuditLog` | CSV/Excel, date-range bound |

> **Notes / Edge Cases**
> - Audit log entries are immutable — no edit or delete for any role.
> - Exports should be capped at 100K rows per request; queue larger exports asynchronously.
> - Log retention policy should be configurable (default: 12 months).

---

### 32. `FeatureFlagsPage.tsx`

**Route:** `/admin/feature-flags` | **Status:** 🔴 Not Started

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Admin | R | View all feature flags with current state | `canManageFeatureFlags` | |
| Admin | U | Toggle a flag on / off globally | `canManageFeatureFlags` | |
| Admin | U | Enable a flag for specific users or tenants | `canManageFeatureFlags` | Percentage rollout |
| Admin | C | Create a new feature flag | `canManageFeatureFlags` | |
| Admin | D | Archive / delete a flag | `canManageFeatureFlags` | |
| Admin | R | View flag change history | `canViewAuditLog` | Who toggled, when |
| Admin | E | Export flag configuration | `canManageFeatureFlags` | JSON |

> **Notes / Edge Cases**
> - Flag changes should be recorded in the audit log automatically.
> - Flags should support targeting by: user ID, tenant ID, percentage rollout, environment.

---

## 💳 Billing & Integrations

---

### 33. `BillingPage.tsx`

**Route:** `/billing` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Owner / Admin | R | View current plan and usage | `canViewBilling` | |
| Owner / Admin | U | Upgrade / downgrade plan | `canManageBilling` | Redirect to Stripe / payment provider |
| Owner / Admin | U | Update payment method | `canManageBilling` | |
| Owner / Admin | C | Add a new billing contact email | `canManageBilling` | |
| Owner / Admin | R | View invoice history | `canViewBilling` | |
| Owner / Admin | E | Download individual invoice PDF | `canViewBilling` | |
| Owner / Admin | C | Apply a coupon / promo code | `canManageBilling` | |
| Owner / Admin | D | Cancel subscription | `canManageBilling` | With confirmation modal |

> **Notes / Edge Cases**
> - Never store raw card details — use Stripe Customer Portal or equivalent.
> - Cancellation should schedule end-of-period termination, not immediate cutoff.
> - Usage metrics (number of properties, team members) should be displayed against plan limits.

---

### 34. `IntegrationsPage.tsx`

**Route:** `/integrations` | **Status:** 🔴 Not Started

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Owner / Admin | R | View all available integrations | `canViewIntegrations` | Connected and available |
| Owner / Admin | C | Connect a new integration | `canManageIntegrations` | OAuth or API key flow |
| Owner / Admin | U | Edit integration settings | `canManageIntegrations` | Scopes, webhook URL |
| Owner / Admin | D | Disconnect an integration | `canManageIntegrations` | Revokes tokens |
| Owner / Admin | R | View integration sync status / logs | `canManageIntegrations` | Last sync time, errors |
| Owner / Admin | U | Trigger a manual sync | `canManageIntegrations` | |
| Owner / Admin | E | Export integration log | `canManageIntegrations` | CSV |
| Standard User | R | View which integrations are active | `canViewIntegrations` | Read-only |

> **Notes / Edge Cases**
> - OAuth tokens must be stored encrypted at rest.
> - Integration disconnect should prompt to confirm and clarify what data will stop syncing.

---

## ❓ Help & System

---

### 35. `HelpCenterPage.tsx`

**Route:** `/help` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | Browse help articles by category | *(default)* | |
| All | R | Search help content (full-text) | *(default)* | |
| All | R | View a single help article | *(default)* | |
| All | O | Mark article as helpful / not helpful | *(default)* | Feedback signal |
| All | S | Copy article link | *(default)* | |
| All | R | Navigate to Contact Support | *(default)* | Link to `/support` |

> **Notes / Edge Cases**
> - Help content should be sourced from a CMS (e.g., Notion, Intercom Articles) via API, not hard-coded.
> - Search should fall back gracefully if no results found, surfacing the Contact Support CTA.

---

### 36. `ContactSupportPage.tsx`

**Route:** `/support` | **Status:** 🟡 In Progress

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | C | Submit a support ticket | *(default)* | Subject, description, category |
| All | C | Attach files to a support ticket | *(default)* | Screenshots, logs |
| All | R | View past submitted tickets and their status | *(default)* | |
| All | R | View replies from support team | *(default)* | |
| All | C | Reply to an open ticket | *(default)* | |
| All | D | Close / cancel a ticket | *(default)* | |
| All | R | Start a live chat (if enabled) | *(default)* | Gated by `liveChatEnabled` flag |

> **Notes / Edge Cases**
> - Tickets should auto-populate the user's account info (plan, browser, app version).
> - Live chat widget should only render if `liveChatEnabled` flag is on and within support hours.

---

### 37. `ChangelogPage.tsx`

**Route:** `/changelog` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View list of product releases | *(default)* | Reverse-chronological |
| All | R | Expand a release to read full notes | *(default)* | |
| All | S | Copy link to a specific version | *(default)* | Deep-link to release entry |
| All | O | Subscribe to changelog via email / RSS | *(default)* | |

> **Notes / Edge Cases**
> - Changelog content should be sourced from a CMS or `CHANGELOG.md`, not hard-coded.

---

### 38. `NotFoundPage.tsx`

**Route:** `*` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View 404 message | *(public)* | |
| All | R | Navigate to home | *(public)* | "Go to dashboard" CTA |
| All | R | Navigate to help | *(public)* | Secondary CTA |

> **Notes / Edge Cases**
> - Log 404 events to analytics to surface broken links.

---

### 39. `UnauthorizedPage.tsx`

**Route:** `/403` | **Status:** 🟢 Built

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View 403 message | *(default)* | Explain which permission is required |
| All | R | Navigate to home | *(default)* | |
| All | R | Request access (if applicable) | *(default)* | Sends a request notification to admin |

> **Notes / Edge Cases**
> - The page should receive a `requiredRole` query param so it can display a contextual message.

---

### 40. `MaintenanceModePage.tsx`

**Route:** `/maintenance` | **Status:** ⚪ Utility

> This page has no user actions — it is a static interstitial shown when the system is taken offline. No action inventory required.

> **Notes / Edge Cases**
> - Controlled via a global `maintenanceMode` feature flag or environment variable.
> - Should display an optional estimated restoration time.
> - Admin users should optionally bypass maintenance mode via a `?bypass=<token>` query param.

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.1.0 | 2026-03-20 | — | Added permission flag column, status badges, grouped sections, role reference table, notes/edge cases per page, completed pages 30–40 |
| 1.0.0 | 2026-03-20 | — | Initial document created from navigation map v1 |
