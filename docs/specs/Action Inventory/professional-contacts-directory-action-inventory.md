# Legal & Professional Contacts Directory – Page & Permission Spec

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Status** | 🔴 Not Started |
| **Last Updated** | 2026-03-20 |
| **Owner** | Product / Engineering |
| **Scope** | Legal & Professional Contacts Directory — standalone and property-linked |

---

## Purpose

This document defines every user-facing action across the Legal & Professional Contacts Directory. The directory serves as a centralised database of legal and professional contacts (e.g., solicitors, conveyancers, accountants, agents, surveyors) that can exist independently or be associated with one or more property records.

Use it to:

- Define feature-flag / permission keys for RBAC middleware and guards
- Drive UI copy, analytics event names, and automated test cases
- Track build status across the directory page inventory

---

## Roles & Permissions Reference

| Role Constant | Display Name | Description |
|---------------|--------------|-------------|
| `ROLE_OWNER` | Owner | Full access. Can create, edit, delete, and manage all contacts and associations. |
| `ROLE_ADMIN` | Admin | Tenant-level admin. Same rights as Owner within their scope. |
| `ROLE_MANAGER` | Manager | Can create and edit contacts but cannot delete or manage permissions. |
| `ROLE_VIEWER` | Viewer | Read-only access. Can search, view, and export contact records. |
| `ROLE_ANY` | All authenticated users | Any logged-in user regardless of role. |

> **Shorthand used in tables below**
> - **Owner / Admin** → `ROLE_OWNER` or `ROLE_ADMIN`
> - **Manager** → `ROLE_MANAGER`
> - **All** → `ROLE_ANY` (any authenticated user)

---

## Contact Types

The directory supports the following professional contact categories. These are used as filter values throughout the directory.

| Type Key | Display Label | Examples |
|----------|--------------|---------|
| `solicitor` | Solicitor / Lawyer | Property lawyer, conveyancer, litigation counsel |
| `accountant` | Accountant / Tax Advisor | Property accountant, tax advisor, auditor |
| `agent` | Agent / Broker | Real estate agent, letting agent, buyer's agent |
| `surveyor` | Surveyor | Building surveyor, valuation surveyor, land surveyor |
| `notary` | Notary / Commissioner | Notary public, commissioner of oaths |
| `financial_advisor` | Financial Advisor | Mortgage broker, financial planner |
| `insurer` | Insurer / Loss Adjuster | Property insurer, claims adjuster |
| `other` | Other Professional | Any professional contact not covered above |

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

### 📋 Directory

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | [DirectorySearchPage](#1-directorysearchpagetsx) | `/directory` | 🔴 |
| 2 | [DirectoryListPage](#2-directorylistpagetsx) | `/directory/contacts` | 🔴 |
| 3 | [ContactProfilePage](#3-contactprofilepagetsx) | `/directory/contacts/:id` | 🔴 |
| 4 | [AddContactPage](#4-addcontactpagetsx) | `/directory/contacts/add` | 🔴 |
| 5 | [PropertyContactsPage](#5-propertycontactspagetsx) | `/property/:id/contacts` | 🔴 |

---

## Action Inventory – Per Page

---

## 📋 Directory

---

### 1. `DirectorySearchPage.tsx`

**Route:** `/directory` | **Status:** 🔴 Not Started

The main entry point for the directory. Provides a unified search and filter interface across all contact records — both standalone and property-linked.

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View search input | *(default)* | Full-text search across name, firm, specialisation |
| All | R | Search by name | *(default)* | First name, last name, or firm/company name |
| All | R | Search by contact type | *(default)* | e.g., Solicitor, Accountant, Surveyor |
| All | R | Search by location | *(default)* | City, postcode, region |
| All | R | Filter by contact type | *(default)* | Multi-select from contact type list |
| All | R | Filter by associated property | *(default)* | Show only contacts linked to a specific property |
| All | R | Filter by availability / status | *(default)* | Active, Inactive, Archived |
| All | R | Filter by tags | *(default)* | Custom tags applied to contact records |
| All | R | Sort results | *(default)* | By name (A–Z), recently added, recently updated |
| All | R | View search results as list or card grid | *(default)* | Toggle view mode |
| All | R | Click a result → navigate to Contact Profile | *(default)* | Goes to `/directory/contacts/:id` |
| All | R | View result count and active filter summary | *(default)* | "Showing 14 of 38 contacts" |
| All | O | Save current search as a named filter | `canSaveSearchFilters` | Persisted per user |
| All | O | Clear all active filters | *(default)* | Reset to unfiltered state |
| Owner / Admin | C | Add new contact from search page | `canAddContacts` | FAB or button → goes to `AddContactPage` |
| Owner / Admin | B | Bulk-select results | `canEditContacts` | Activates bulk action toolbar |
| Owner / Admin | B | Bulk-tag selected contacts | `canEditContacts` | Apply or remove tags across selection |
| Owner / Admin | B | Bulk-archive selected contacts | `canArchiveContacts` | Soft-archive with confirmation |
| Owner / Admin | E | Export search results | `canExportContacts` | CSV/Excel — exports current filtered set |

> **Notes / Edge Cases**
> - Search should be debounced (300 ms) to avoid excessive API calls.
> - Empty search state should show a "Browse all contacts" CTA, not a blank screen.
> - Saved filters are user-scoped, not organisation-scoped.
> - Export should reflect the active filter state, not the full directory.
> - If a contact is linked to a property the user cannot access, the contact still appears but the property link is hidden.

---

### 2. `DirectoryListPage.tsx`

**Route:** `/directory/contacts` | **Status:** 🔴 Not Started

A paginated, sortable list of all contact records in the directory. Acts as the full browse view, separate from the search-first entry point.

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View full contact list (paginated) | *(default)* | Cards or table rows; 25 per page default |
| All | R | Sort by name, type, date added, last updated | *(default)* | |
| All | R | Filter by contact type | *(default)* | |
| All | R | Filter by associated property | *(default)* | |
| All | R | Filter by status | *(default)* | Active, Inactive, Archived |
| All | R | Filter by tags | *(default)* | |
| All | R | Toggle list vs. card grid view | *(default)* | Preference persisted per user |
| All | R | Click a contact → navigate to Contact Profile | *(default)* | |
| All | E | Export full contact list | `canExportContacts` | CSV/Excel — full unfiltered directory |
| All | E | Export filtered contact list | `canExportContacts` | CSV/Excel — respects active filters |
| All | O | Mark a contact as favourite (star) | *(default)* | User-level favourite, not global |
| Owner / Admin | C | Add new contact | `canAddContacts` | Button → goes to `AddContactPage` |
| Owner / Admin | B | Bulk-select contacts | `canEditContacts` | Activates bulk action toolbar |
| Owner / Admin | B | Bulk-tag selected contacts | `canEditContacts` | |
| Owner / Admin | B | Bulk-change status | `canEditContacts` | Active ↔ Inactive ↔ Archived |
| Owner / Admin | B | Bulk-assign to a property | `canLinkContactsToProperties` | Link selected contacts to a property |
| Owner / Admin | B | Bulk-delete selected contacts | `canDeleteContacts` | Hard delete with confirmation modal |
| Owner / Admin | B | Bulk-export selected contacts | `canExportContacts` | CSV/Excel — selection only |
| Manager | U | Edit contact inline (quick fields) | `canEditContacts` | e.g., status, tags — not full profile |

> **Notes / Edge Cases**
> - Archived contacts should be hidden from the default view behind a "Show archived" toggle.
> - Bulk delete should require typing "DELETE" in a confirmation input.
> - Favourites are stored per user and do not affect other users' views.
> - View mode (list/grid) preference should persist across sessions via user settings.
> - Pagination should support both page-number navigation and infinite scroll (toggle via settings).

---

### 3. `ContactProfilePage.tsx`

**Route:** `/directory/contacts/:id` | **Status:** 🔴 Not Started

The full detail view for a single contact record. Displays all profile fields, contact details, associated properties, documents, and activity history.

#### 3a. Profile & Contact Details

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View full name, job title, firm / company | *(default)* | |
| All | R | View contact type / specialisation | *(default)* | e.g., Solicitor, Surveyor |
| All | R | View profile photo / avatar | *(default)* | |
| All | R | View primary email address | `canViewContactDetails` | |
| All | R | View phone numbers (mobile, office, fax) | `canViewContactDetails` | |
| All | R | View office / postal address | `canViewContactDetails` | |
| All | R | View website URL | *(default)* | |
| All | R | View LinkedIn / professional profile links | *(default)* | |
| All | R | View tags and custom categories | *(default)* | |
| All | R | View internal notes summary | *(default)* | Truncated; expands to full notes tab |
| All | R | View status badge | *(default)* | Active / Inactive / Archived |
| All | O | Copy email to clipboard | *(default)* | One-click copy |
| All | O | Copy phone to clipboard | *(default)* | One-click copy |
| All | O | Mark contact as favourite | *(default)* | User-level star |
| All | S | Share contact profile link | `canShareContacts` | Read-only shareable URL |
| Owner / Admin | U | Edit all profile fields | `canEditContacts` | Opens inline edit or edit modal |
| Owner / Admin | U | Change profile photo | `canEditContacts` | Upload / crop |
| Owner / Admin | U | Add / remove tags | `canEditContacts` | |
| Owner / Admin | U | Change contact status | `canEditContacts` | Active / Inactive / Archived |
| Owner / Admin | D | Delete contact record | `canDeleteContacts` | Hard delete with confirmation; irreversible |
| Owner / Admin | O | Archive contact | `canArchiveContacts` | Soft-archive; recoverable |
| Manager | U | Edit basic fields | `canEditContacts` | Name, phone, email, tags — not delete |

#### 3b. Associated Properties

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View list of associated properties | `canViewPropertyLinks` | Property name, address, link type |
| All | R | Click a property → navigate to Property Overview | *(default)* | Only if user has access to that property |
| All | R | View link type / role | *(default)* | e.g., "Acting Solicitor", "Surveyor for valuation" |
| Owner / Admin | C | Link contact to a property | `canLinkContactsToProperties` | Select from portfolio; add role/context |
| Owner / Admin | U | Edit the link type / role label | `canLinkContactsToProperties` | |
| Owner / Admin | D | Remove property association | `canLinkContactsToProperties` | Removes link only; does not delete contact or property |
| Owner / Admin | B | Link contact to multiple properties at once | `canLinkContactsToProperties` | Multi-select from portfolio |

#### 3c. Documents

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View documents attached to this contact | `canViewContactDocuments` | e.g., engagement letter, NDA, credentials |
| All | R | Search / filter documents by type or date | `canViewContactDocuments` | |
| All | E | Download a document | `canDownloadContactDocuments` | |
| All | B | Bulk-download selected documents (ZIP) | `canDownloadContactDocuments` | |
| Owner / Admin | C | Upload a new document | `canUploadContactDocuments` | Drag-drop or browse |
| Owner / Admin | U | Rename / re-tag a document | `canEditContactDocuments` | |
| Owner / Admin | D | Delete a document | `canDeleteContactDocuments` | Soft-delete |
| Owner / Admin | S | Generate shareable link for a document | `canShareContactDocuments` | Read-only, time-limited |

#### 3d. Notes & Activity

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View chronological notes and activity log | `canViewContactNotes` | Who did what, when |
| All | C | Add a new note | `canAddContactNotes` | Rich-text editor |
| All | U | Edit own note | `canEditOwnContactNotes` | |
| All | D | Delete own note | `canDeleteOwnContactNotes` | |
| Owner / Admin | U | Edit any note | `canEditAllContactNotes` | |
| Owner / Admin | D | Delete any note | `canDeleteAllContactNotes` | |
| All | O | Pin a note | `canEditOwnContactNotes` | Keeps at top of list |
| All | R | View full audit trail | `canViewContactAuditTrail` | All edits, uploads, link changes |
| Owner / Admin | E | Export notes & activity log | `canExportContactNotes` | PDF / CSV |

> **Notes / Edge Cases**
> - Contact details (email, phone) should be masked for `ROLE_VIEWER` if the `contactPrivacy` feature flag is enabled — show only on explicit "Reveal" click which is logged in the audit trail.
> - Deleting a contact should warn the user if the contact is currently linked to one or more properties; user must confirm before proceeding.
> - Archived contacts remain visible to Admins but are hidden from Viewers unless "Show archived" is toggled.
> - The associated property list should only show properties the current user has permission to see. If a contact is linked to a restricted property, show "1 additional linked property (restricted)" rather than nothing.
> - Profile photo upload: max 5 MB, JPG/PNG/WebP only.
> - Audit trail entries are immutable — no role can edit or delete them.

---

### 4. `AddContactPage.tsx`

**Route:** `/directory/contacts/add` | **Status:** 🔴 Not Started

Form page for creating a new contact record. Supports both standalone creation and creation with an immediate property association.

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| Owner / Admin | C | Enter full name (first, last) | `canAddContacts` | Required |
| Owner / Admin | C | Enter job title | `canAddContacts` | |
| Owner / Admin | C | Enter firm / company name | `canAddContacts` | |
| Owner / Admin | C | Select contact type | `canAddContacts` | From contact type list; required |
| Owner / Admin | C | Enter primary email | `canAddContacts` | Required; validated on submit |
| Owner / Admin | C | Enter phone numbers | `canAddContacts` | Mobile, office, fax — all optional |
| Owner / Admin | C | Enter office / postal address | `canAddContacts` | |
| Owner / Admin | C | Enter website URL | `canAddContacts` | |
| Owner / Admin | C | Enter professional profile links | `canAddContacts` | LinkedIn, etc. |
| Owner / Admin | C | Upload profile photo | `canAddContacts` | Optional; max 5 MB |
| Owner / Admin | C | Add tags | `canAddContacts` | Multi-select from existing tags or create new |
| Owner / Admin | C | Set status | `canAddContacts` | Active (default) / Inactive |
| Owner / Admin | C | Link to one or more properties | `canLinkContactsToProperties` | Optional; multi-select from portfolio |
| Owner / Admin | C | Set link role / context for each property | `canLinkContactsToProperties` | e.g., "Acting Solicitor", "Appointed Surveyor" |
| Owner / Admin | C | Add an initial note | `canAddContactNotes` | Optional free-text |
| Owner / Admin | C | Upload initial documents | `canUploadContactDocuments` | Optional |
| Owner / Admin | C | Save as draft | `canAddContacts` | Returns to draft on next visit |
| Owner / Admin | C | Submit (create contact) | `canAddContacts` | Validates all required fields before saving |
| Owner / Admin | R | View inline validation errors | *(default)* | Per-field error messages |
| Owner / Admin | U | Edit any field before final submit | `canAddContacts` | |
| Owner / Admin | E | Export the filled-out form as PDF | `canExportContacts` | For offline record-keeping |
| Manager | C | Create contact (limited fields) | `canAddContacts` | Name, type, email, phone, tags — no property linking |

> **Notes / Edge Cases**
> - Email uniqueness should be validated on submit — warn (not block) if a contact with the same email already exists, showing a link to the duplicate.
> - Draft auto-saves every 30 seconds.
> - If the user arrives from a property page (e.g., via `/property/:id/contacts/add`), that property should be pre-selected and locked in the property association field.
> - Tag creation inline should be instant (no page reload); new tags are immediately available globally.
> - Contact type is required — the form should not submit without it.

---

### 5. `PropertyContactsPage.tsx`

**Route:** `/property/:id/contacts` | **Status:** 🔴 Not Started

A property-scoped view of the directory, showing only contacts linked to a specific property. Lives within the property detail tab bar alongside Documents, Financials, etc.

| Actor | Code | Action | Permission Flag | Description |
|-------|------|--------|----------------|-------------|
| All | R | View all contacts linked to this property | `canViewPropertyContacts` | Name, type, role/context, status |
| All | R | Sort by name, contact type, date linked | *(default)* | |
| All | R | Filter by contact type | *(default)* | |
| All | R | Filter by status | *(default)* | Active / Inactive / Archived |
| All | R | Search by name or firm | *(default)* | |
| All | R | Click a contact → navigate to Contact Profile | *(default)* | Goes to `/directory/contacts/:id` |
| All | R | View link role / context label | *(default)* | e.g., "Acting Solicitor for Purchase", "Appointed Surveyor" |
| All | E | Export contact list for this property | `canExportContacts` | CSV/Excel |
| All | O | Copy contact email to clipboard | *(default)* | Inline, no need to open profile |
| All | O | Copy contact phone to clipboard | *(default)* | Inline |
| All | S | Share this contact list | `canShareContacts` | Read-only snapshot link |
| Owner / Admin | C | Link an existing contact to this property | `canLinkContactsToProperties` | Search and select from full directory |
| Owner / Admin | C | Create and link a new contact | `canAddContacts` | Shortcut → goes to `AddContactPage` with property pre-filled |
| Owner / Admin | U | Edit the link role / context label | `canLinkContactsToProperties` | Inline edit |
| Owner / Admin | D | Remove a contact from this property | `canLinkContactsToProperties` | Removes link only; contact record is preserved |
| Owner / Admin | B | Bulk-remove selected contacts from this property | `canLinkContactsToProperties` | Removes links; does not delete contact records |
| Owner / Admin | B | Bulk-export selected contacts | `canExportContacts` | CSV/Excel — selection only |

> **Notes / Edge Cases**
> - Removing a contact from a property only deletes the association — the contact record in the directory is fully preserved.
> - If a linked contact has been archived at the directory level, show them with a muted "Archived" badge rather than hiding them entirely.
> - The "Link existing contact" flow should use the same search/filter UI as `DirectorySearchPage` within a modal or slide-over panel.
> - This page should be accessible from the property detail tab bar alongside Documents, Financials, Tenants, etc.
> - If no contacts are linked yet, show an empty state with two CTAs: "Link existing contact" and "Add new contact."

---

## Data Model Reference

Key fields that make up a contact record, for use when building the database schema or API contract.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | Yes | Primary key |
| `first_name` | String | Yes | |
| `last_name` | String | Yes | |
| `job_title` | String | No | |
| `firm_name` | String | No | Company or firm name |
| `contact_type` | Enum | Yes | See contact types table above |
| `email_primary` | String | Yes | Validated email; unique warning on duplicate |
| `email_secondary` | String | No | |
| `phone_mobile` | String | No | |
| `phone_office` | String | No | |
| `phone_fax` | String | No | |
| `address_line_1` | String | No | |
| `address_line_2` | String | No | |
| `city` | String | No | |
| `postcode` | String | No | |
| `country` | String | No | ISO 3166-1 alpha-2 |
| `website_url` | String | No | Validated URL |
| `linkedin_url` | String | No | |
| `profile_photo_url` | String | No | Stored in object storage |
| `tags` | String[ ] | No | Array of tag strings |
| `status` | Enum | Yes | `active` / `inactive` / `archived` |
| `notes` | Relation | No | One-to-many; see Notes model |
| `documents` | Relation | No | One-to-many; see Documents model |
| `properties` | Relation | No | Many-to-many via `contact_property_links` |
| `created_by` | UUID | Yes | FK → users |
| `created_at` | Timestamp | Yes | |
| `updated_at` | Timestamp | Yes | |
| `archived_at` | Timestamp | No | Null if not archived |

### `contact_property_links` join table

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | Yes | |
| `contact_id` | UUID | Yes | FK → contacts |
| `property_id` | UUID | Yes | FK → properties |
| `role_label` | String | No | e.g., "Acting Solicitor", "Appointed Surveyor" |
| `linked_by` | UUID | Yes | FK → users |
| `linked_at` | Timestamp | Yes | |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-20 | — | Initial document — Legal & Professional Contacts Directory (3 pages + add flow + property-scoped view) |
