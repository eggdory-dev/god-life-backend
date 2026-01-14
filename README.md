# God Life Backend

갓생(God Life) 플래너 앱의 백엔드 레포지토리입니다.

## Architecture

- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (Google, Apple, Kakao)
- **Storage**: Supabase Storage
- **Server Logic**: Supabase Edge Functions (Deno)
- **AI**: Anthropic Claude 3.5 Sonnet

## Prerequisites

1. **Node.js** 18+ (for Supabase CLI)
2. **Supabase CLI**
3. **Supabase Account** (supabase.com)

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Create Supabase Project

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
   - Choose project name: `god-life`
   - Choose region: closest to your users (e.g., ap-northeast-2 for Korea)
   - Set database password (save it securely)
3. Note your **Project Ref** from Project Settings → API

### 3. Link Local Project

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

### 4. Configure Environment Variables

Update `supabase/config.toml` with your OAuth credentials:

```toml
[auth.external.google]
client_id = "your-google-client-id"
secret = "your-google-secret"

[auth.external.apple]
client_id = "your-apple-client-id"
secret = "your-apple-secret"
```

### 5. Run Database Migrations

```bash
# Reset local database (development)
supabase db reset

# Or apply migrations only
supabase migration up
```

This will create:
- 20 database tables
- Row Level Security policies
- Database functions and triggers
- Seed data (insights, challenges)

### 6. Set Edge Function Secrets

```bash
# Anthropic API Key
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Apple In-App Purchase
supabase secrets set APPLE_SHARED_SECRET=...

# Google Service Account (for Android IAP)
supabase secrets set GOOGLE_SERVICE_ACCOUNT=...

# Firebase Cloud Messaging
supabase secrets set FCM_SERVER_KEY=...
```

### 7. Start Local Development

```bash
# Start Supabase services (DB, Auth, Storage, Edge Functions)
supabase start

# In another terminal, serve Edge Functions with auto-reload
supabase functions serve --no-verify-jwt
```

Your local Supabase instance will be available at:
- Studio: http://localhost:54323
- API: http://localhost:54321
- DB: postgresql://postgres:postgres@localhost:54322/postgres

## Project Structure

```
god-life-backend/
├── docs/                           # Documentation
│   ├── prd.md                      # Product requirements
│   ├── API_SPECIFICATION.md        # API endpoints spec
│   └── ...
├── supabase/
│   ├── config.toml                 # Supabase configuration
│   ├── migrations/                 # Database migrations
│   │   ├── 20260114000001_initial_schema.sql
│   │   ├── 20260114000002_rls_policies.sql
│   │   ├── 20260114000003_functions_triggers.sql
│   │   └── 20260114000004_seed_data.sql
│   └── functions/                  # Edge Functions (Deno)
│       ├── _shared/                # Shared utilities
│       │   ├── database.ts
│       │   ├── auth.ts
│       │   ├── ai-client.ts
│       │   ├── rate-limiter.ts
│       │   ├── response.ts
│       │   ├── errors.ts
│       │   ├── validators.ts
│       │   └── types.ts
│       ├── auth-social/            # POST /auth/social
│       ├── users-onboarding/       # PUT /users/me/onboarding
│       ├── routines/               # GET/POST /routines
│       ├── coaching-messages/      # POST /coaching/conversations/{id}/messages
│       └── ...                     # 28 Edge Functions total
└── README.md
```

## Database Schema

### Core Tables (20 tables)

- **User Management**: `profiles`
- **Routines**: `routines`, `routine_completions`
- **AI Coaching**: `coaching_conversations`, `coaching_messages`, `coaching_reports`, `ai_usage_tracking`
- **Social**: `groups`, `group_members`, `group_invites`, `group_cheers`
- **Challenges**: `challenges`, `challenge_participants`, `challenge_verifications`
- **System**: `notifications`, `push_tokens`, `insights`

See `/supabase/migrations/20260114000001_initial_schema.sql` for full schema.

## API Endpoints

See `docs/API_SPECIFICATION.md` for complete API documentation.

### Authentication
- `POST /auth/social` - Social login (Google/Apple/Kakao)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

### User Management
- `GET /users/me` - Get profile
- `PUT /users/me/onboarding` - Save onboarding preferences
- `PATCH /users/me` - Update profile
- `PATCH /users/me/settings` - Update settings

### Routines
- `GET /routines` - List routines
- `POST /routines` - Create routine (5 limit for free users)
- `PATCH /routines/{id}` - Update routine
- `DELETE /routines/{id}` - Delete routine
- `POST /routines/{id}/complete` - Mark complete (streak calculation)
- `DELETE /routines/{id}/complete` - Undo completion

### AI Coaching
- `GET /coaching/conversations` - List conversations
- `POST /coaching/conversations` - Start new conversation
- `POST /coaching/conversations/{id}/messages` - Send message (3/day free, streaming)
- `POST /coaching/conversations/{id}/report` - Generate coaching report

### Home
- `GET /home` - Home dashboard data
- `GET /home/insight` - Daily insight (faith/universal)

...and 20+ more endpoints

## Development Workflow

### Create New Migration

```bash
supabase migration new add_new_feature
# Edit the generated file in supabase/migrations/
supabase db reset  # Apply locally
```

### Create New Edge Function

```bash
supabase functions new my-function
# Edit supabase/functions/my-function/index.ts
supabase functions serve my-function --no-verify-jwt
```

### Test Edge Function Locally

```bash
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Authorization: Bearer YOUR_TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Deploy to Production

```bash
# Deploy database migrations
supabase db push --linked

# Deploy all Edge Functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy auth-social
```

## Testing

### Run Unit Tests

```bash
# Test database functions
supabase test db

# Test Edge Functions
deno test supabase/functions/
```

### Run Integration Tests

```bash
# Test complete user flows
npm run test:integration
```

### Load Testing

```bash
# Install k6
brew install k6

# Run load tests
k6 run tests/load/api-endpoints.js --vus 100 --duration 30s
```

## Monitoring

### View Logs

```bash
# Edge Function logs
supabase functions logs my-function --tail

# Database logs
supabase db logs
```

### Check Metrics

Visit Supabase Dashboard:
- Database usage
- API requests
- Storage usage
- Active users

## Security

- ✅ Row Level Security enabled on all tables
- ✅ JWT validation on all Edge Functions
- ✅ Input validation with Zod
- ✅ Rate limiting on AI endpoints
- ✅ Subscription checks before Pro features
- ✅ OAuth tokens verified server-side
- ✅ Secrets stored in Supabase Secrets

## Cost Estimates

### Supabase Pro Tier: $25/month
- 8GB database
- 100GB storage
- 2M Edge Function invocations

### Anthropic AI (Claude 3.5 Sonnet)
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens
- Estimated: ~$1,620/month for 1,000 free users (3 conversations/day)
- Pro users: ~$9/month per user

**Total for 1,000 users:** ~$1,700-2,000/month

## Contributing

1. Create a new branch for your feature
2. Make changes and test locally
3. Create a migration if database schema changes
4. Deploy to staging first
5. Create PR for review

## Support

For questions or issues:
- Check `docs/` for detailed documentation
- Review `/Users/eggdory/.claude/plans/piped-floating-thacker.md` for implementation plan
- Open an issue in this repository

## License

[Your License Here]
