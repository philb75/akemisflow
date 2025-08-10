# GitHub Codespaces Setup for AkemisFlow

## Quick Setup Guide

### 1. Create Codespace from GitHub UI

When creating your Codespace for `philb75/akemisflow`:

1. **Name**: `philb75/akemisflow`
2. **Branch**: Select `dev` branch (for development work)
3. **Container image**: Select `universal` (includes Node.js, PostgreSQL, pnpm)
4. **Setup script**: Select `Manual` 
5. **Agent Internet access**: Set to `On`

### 2. Environment Variables

The `.devcontainer/devcontainer.json` automatically configures:

#### Core Variables
- `DATABASE_URL`: PostgreSQL connection for Prisma
- `NEXTAUTH_URL`: Auto-configured with Codespace URL
- `NEXTAUTH_SECRET`: Pre-configured development secret

#### Supabase Local (Auto-configured)
- `NEXT_PUBLIC_SUPABASE_URL`: http://localhost:54321
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Development key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

#### Airwallex Test Credentials (Pre-configured)
- `AIRWALLEX_CLIENT_ID`: ooSEP1J_RVCyQJCXMZx42g
- `AIRWALLEX_API_KEY`: 894d904d7c01237087c5b9b458003bfb8393e7b9638a1bf64c80bb6dc1b9df399d45c3a29e4eb6230592912c6bd489bb
- `AIRWALLEX_BASE_URL`: https://api-demo.airwallex.com (demo environment)

### 3. Automatic Setup

The setup script (`.devcontainer/setup.sh`) automatically:
1. Installs pnpm and Supabase CLI
2. Sets up local Supabase instance
3. Configures PostgreSQL database
4. Runs Prisma migrations
5. Creates admin user account

### 4. Access Points

After setup completes:

#### Application
- **Next.js App**: https://[codespace-name]-3000.app.github.dev
- **Admin Login**: 
  - Email: `philb75@gmail.com`
  - Password: `Philb123$`

#### Supabase Local Services
- **Supabase Studio**: Port 54323 (database UI)
- **API Gateway**: Port 54321 (REST API)
- **PostgreSQL**: Port 54322 (direct DB access)

### 5. Development Workflow

```bash
# Start development server
pnpm dev

# Access application
# The URL will be shown in terminal, e.g.:
# https://fictional-space-engine-3000.app.github.dev

# View Supabase Studio
# Forward port 54323 and open in browser

# Run tests
pnpm test:quick

# Check Airwallex sync
pnpm test:airwallex
```

### 6. VS Code Extensions

Automatically installed:
- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- GitHub Copilot

### 7. Troubleshooting

#### Database Connection Issues
```bash
# Restart Supabase
supabase stop
supabase start

# Check status
supabase status
```

#### Port Forwarding
- Ports 3000, 54321, 54322, 54323 are auto-forwarded
- Set visibility to "Public" if sharing with team

#### Airwallex API
- Using demo environment (api-demo.airwallex.com)
- Test credentials are read-only
- No real transactions will be processed

### 8. Data Persistence

- Database data persists within the Codespace
- Upload files stored in `/workspace/uploads`
- Changes to code are auto-saved

### 9. Stopping Codespace

```bash
# Before stopping, ensure data is saved
pnpm prisma db push

# Stop Supabase services
supabase stop
```

## Advanced Configuration

### Custom Airwallex Credentials

To use production Airwallex:
1. Go to Codespace Settings > Secrets
2. Add `AIRWALLEX_CLIENT_ID` and `AIRWALLEX_API_KEY`
3. Update `AIRWALLEX_BASE_URL` to `https://api.airwallex.com`

### Connect to External Supabase

Replace local Supabase with cloud instance:
```bash
# Update environment variables
export DATABASE_URL="your-supabase-connection-string"
export NEXT_PUBLIC_SUPABASE_URL="your-project-url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### Performance Tips

1. Use 4-core machine type for better performance
2. Enable prebuilds for faster startup
3. Use `pnpm` instead of `npm` (pre-configured)

---

## Quick Reference

| Service | Port | URL Pattern |
|---------|------|-------------|
| Next.js App | 3000 | `https://[codespace]-3000.app.github.dev` |
| Supabase API | 54321 | `http://localhost:54321` |
| PostgreSQL | 54322 | `postgresql://postgres:postgres@localhost:54322/postgres` |
| Supabase Studio | 54323 | `http://localhost:54323` |

| Credential | Value |
|------------|-------|
| Admin Email | philb75@gmail.com |
| Admin Password | Philb123$ |
| Airwallex Client ID | ooSEP1J_RVCyQJCXMZx42g |
| Airwallex Environment | Demo (api-demo.airwallex.com) |