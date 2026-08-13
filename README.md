# Valgate

Valgate is a property portfolio management web app for owners (consumer release) with Clerk auth, Neon data, photos/documents, map, email/storage integrations.

## Local Development

### Prerequisites
- Node.js
- npm

### Setup & Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Access the application at: [http://localhost:3001](http://localhost:3001)

## Release Gates & Verification

Before any deployment, the following gates **must** pass:
- **Build**: `npm run build`
- **Test**: `npm run test`
- **Lint**: `npm run lint`
- **Local Preview**: `npm run test:preview`

## Production Deployment Guide

Refer to the detailed owner-only checklist: [docs/migration/PROD-DEPLOY-CHECKLIST.md](docs/migration/PROD-DEPLOY-CHECKLIST.md).
**Warning**: The MCP sections in that checklist are historical and are superseded by the current consumer posture.

### 1. Environment Configuration
Ensure all required variables are set in your production environment. Optional product integrations must be configured if enabled. Do not commit secrets or values to version control.

- **Database**: `DATABASE_URL`
- **Maps**: `NEXT_PUBLIC_MAPBOX_TOKEN`
- **Identity**: Clerk public, server, and webhook variables
- **App Identity**: `NEXT_PUBLIC_APP_URL` (**Required: App fails closed if missing in production**)
- **Storage**: Storage integration variables
- **Email**: Resend integration variables
- **Infrastructure**: Upstash variables, `CRON_SECRET`

### 2. Database Migration Safety
Follow this sequence strictly to prevent data loss:
1. Verify connectivity: `npm run db:ping`
2. Apply migrations: `npm run db:migrate`
3. **CRITICAL**: Do not run seed/reset in production.

### 3. Deployment Sequence
1. Run all release gates.
2. Human operator provisions and reviews production Clerk, DNS, Neon, and Vercel settings.
3. rotate the exposed production database password before trusting the environment.
4. Execute the database migration sequence (`db:ping` then `db:migrate`).
5. Deploy application only after **explicit approval**.

### 4. Rollback Procedure
In the event of a critical failure:
1. redeploy known-good release.
2. Choose a DB recovery action only with owner approval.

### 5. Post-Deploy Smoke Tests
- Verify sign-up and sign-in flows.
- Confirm empty owner state for new accounts.
- Add a property and upload a document/photo (if corresponding integrations are configured).
- Verify sign-out and sign-in.
- Test error paths.
- **Note**: MCP features are not included in this release.

## Consumer Release Posture

This release follows a strict consumer-release posture:
- **UI**: Settings UI is hidden.
- **Backend**: MCP backend deferred.
- **Security**: MCP_ALLOW_ANY_OAUTH_CLIENT must not be set.
- **Future Enablement**: MCP features may be restored only after an explicit OAuth allowlisting/consent/privacy/security review.
