# Badge Aggregator API

A fast Discord badge aggregation API built with [Bun](https://bun.sh) and Redis caching.

# Preview
https://badges.atums.world

## Features

- Aggregates custom badge data from multiple sources (e.g. Vencord, Nekocord, Equicord, etc.)
- Optional caching via Redis (1 hour per user-service combo)
- Supports query options for service filtering, separated output, and cache bypass
- Written in TypeScript with formatting and linting using [BiomeJS](https://biomejs.dev)

## Requirements

- [Bun](https://bun.sh) (v1.2.9+)
- Redis instance, i suggest [Dragonfly](https://www.dragonflydb.io/)

## Environment

Copy the `.env.example` file in the root:

```bash
cp .env.example .env
```

Then edit the `.env` file as needed:

```env
# NODE_ENV is optional and can be used for conditional logic
NODE_ENV=development

# The server will bind to this host and port
HOST=0.0.0.0
PORT=8080

# Redis connection URL, password isn't required
REDIS_URL=redis://username:password@localhost:6379

# Value is in seconds
REDIS_TTL=3600

#only use this if you want to show discord badges
DISCORD_TOKEN=discord_bot_token
```

## Endpoint

```http
GET /:userId
```

### Path Parameters

| Name    | Description              |
|---------|--------------------------|
| userId  | Discord User ID to query |

### Query Parameters

| Name         | Description                                                                                       |
|--------------|---------------------------------------------------------------------------------------------------|
| `services`   | A comma or space separated list of services to fetch badges from, if this is empty it fetches all |
| `exclude`    | A comma or space separated list of services to exclude (overrides `services`)                    |
| `cache`      | Set to `true` or `false` (default: `true`). `false` bypasses Redis                                |
| `seperated`  | Set to `true` to return results grouped by service, else merged array                             |
| `capitalize` | Set to `true` to capitalize service names in response (only works with `seperated=true`)          |

### Supported Services

- Vencord
- Equicord
- Nekocord
- ReviewDb
- Enmity
- Discord ( some )

### Example

```http
GET /209830981060788225?seperated=true&cache=true&services=equicord
```

## Start the Server

```bash
bun i
bun run start
```

## License
[BSD 3](LICENSE)
