# Badge API

Discord badge aggregation API built with Bun and Redis.

**Live:** https://badges.equicord.org

## Setup

```bash
bun install
cp .env.example .env
# Edit .env with REDIS_URL
bun run start
```

**Requirements:** [Bun](https://bun.sh) v1.2.9+, Redis

## API

```http
GET /:userId?services=vencord,equicord&separated=true
```

### Query Parameters
- `services` - Comma/space-separated list (default: all)
- `exclude` - Exclude services
- `cache` - Use cache (default: true)
- `separated` - Group by service (default: false)
- `capitalize` - Capitalize service names (with separated)

### Supported Services
Vencord, Equicord, Nekocord, ReviewDB, Aero, Aliucord, Ra1ncord, Velocity, BadgeVault, Enmity, Discord, Replugged

## Admin API

Requires `X-Admin-API-Key` header.

```http
POST /admin/cache/refresh?service=vencord
POST /admin/cache/clear?service=vencord
GET  /admin/cache/metrics
POST /admin/cache/reset-metrics
```

## Configuration

Required:
- `REDIS_URL` - Redis connection string

Optional:
- `REDIS_TTL` - Cache TTL in seconds (default: 3600)
- `DISCORD_TOKEN` - For Discord badges
- `ADMIN_API_KEY` - Admin endpoints auth
- `BLOCKLIST_ENABLED` - Enable blocklist (default: true)

See `.env.example` for all options.

## Development

```bash
bun run lint        # Check code
bun run lint:fix    # Auto-fix issues
bunx tsc --noEmit   # Type check
docker compose up   # Run with Docker
```

## License

[BSD-3-Clause](LICENSE)
