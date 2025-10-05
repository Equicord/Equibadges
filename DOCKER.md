# Badge Aggregator API

A fast Discord badge aggregation API that collects badges from multiple Discord client mods and services.

## Quick Start

```bash
docker run -d \
  -p 8080:8080 \
  -e REDIS_URL=redis://your-redis:6379 \
  -e DISCORD_TOKEN=your_bot_token \
  cr8ns/badgeapi:latest
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOST` | No | `0.0.0.0` | Server bind address |
| `PORT` | No | `8080` | Server port |
| `REDIS_URL` | Yes | - | Redis connection URL |
| `REDIS_TTL` | No | `3600` | Cache TTL in seconds |
| `DISCORD_TOKEN` | No | - | Discord bot token for Discord badges |

## Docker Compose

```yaml
services:
  badge-api:
    image: cr8ns/badgeapi:latest
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://dragonfly:6379
      - DISCORD_TOKEN=your_bot_token
    depends_on:
      - dragonfly

  dragonfly:
    image: docker.dragonflydb.io/dragonflydb/dragonfly
    volumes:
      - dragonfly-data:/data

volumes:
  dragonfly-data:
```

## Usage

Fetch badges for a Discord user:

```
GET /:userId?services=vencord,equicord&cache=true
```

## Supported Services

- Vencord
- Equicord
- Nekocord
- ReviewDb
- Enmity
- Discord
- Aero
- Aliucord
- Ra1ncord
- Replugged
- Velocity
- BadgeVault

## Source Code

https://github.com/cr8ns/badgeAPI
