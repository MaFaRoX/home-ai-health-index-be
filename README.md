# Healthcare Backend

## Prerequisites

- Node.js v18+ (v25 currently installed)
- npm 9+ (consider upgrading to npm 10+ to avoid Windows stdin issues)
- MySQL Server 8+

## Getting Started

1. Copy `.env.example` to `.env` and update credentials.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run TypeScript compilation check:
   ```bash
   npx tsc --noEmit
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

The server exposes a health check at `GET /health` and the API router under `/api`.

## Database

- Run the SQL scripts under `db/migrations` against your MySQL instance to bootstrap the schema.
- Seed catalog tables (`indicator_categories`, `indicators`, `indicator_translations`) with the data defined in the frontend constants.

## Project Structure

- `src/app.ts` – Express app configuration (middleware, routes)
- `src/server.ts` – server bootstrap with database connection check
- `src/config` – environment variable validation and MySQL pool setup
- `src/routes` – REST API route definitions
- `db/migrations` – SQL migration scripts
- `docs` – architecture and schema documentation

## Scripts

- `npm run dev` – Start development server with `nodemon` and `ts-node`
- `npm run build` – Compile TypeScript to JavaScript (`dist/`)
- `npm run start` – Run compiled server from `dist/`
- `npx tsc --noEmit` – Type checking (temporary workaround for `npm run type-check` on Windows + npm 9)

## Authentication API

Base path: `/api/auth`

| Method | Path       | Description                    | Requires Auth |
|--------|------------|--------------------------------|---------------|
| POST   | `/register`| Create user account            | No            |
| POST   | `/login`   | Obtain access + refresh tokens | No            |
| POST   | `/refresh` | Rotate tokens using refresh    | No            |
| POST   | `/logout`  | Invalidate refresh token       | No (token)    |
| GET    | `/me`      | Current user profile           | Yes (Bearer)  |

### Request payloads

```json
POST /api/auth/register
{
  "fullName": "Jane Doe",
  "phone": "+84901234567",
  "password": "supersecret",
  "sex": "female",
  "preferredLanguage": "vi"
}
```

```json
POST /api/auth/login
{
  "phone": "+84901234567",
  "password": "supersecret"
}
```

```json
POST /api/auth/refresh
{
  "refreshToken": "<refresh token string>"
}
```

```json
POST /api/auth/logout
{
  "refreshToken": "<refresh token string>"
}
```

### Responses

Successful register/login/refresh return:

```json
{
  "user": {
    "id": 1,
    "fullName": "Jane Doe",
    "phone": "+84901234567",
    "preferredLanguage": "vi",
    "sex": "female"
  },
  "tokens": {
    "accessToken": "<jwt>",
    "accessTokenExpiresIn": 900,
    "refreshToken": "<refresh token>",
    "refreshTokenExpiresAt": "2025-12-01T12:00:00.000Z"
  }
}
```

`GET /api/auth/me` requires an `Authorization: Bearer <access token>` header and returns `{ "user": { ... } }`.

## Indicator Catalogue

- `GET /api/indicators?language=vi` – returns categories and indicator metadata (unit, reference ranges, translated labels). Defaults to `vi` when `language` is omitted.

Example:
```json
{
  "categories": [
    {
      "id": 2,
      "slug": "blood-sugar",
      "color": "bg-red-500",
      "indicators": [
        {
          "id": 5,
          "slug": "glucose",
          "name": "Glucose (Đường huyết)",
          "unit": "mg/dL",
          "referenceRange": { "min": 70, "max": 100 },
          "referenceText": "Bình thường: 70-100 mg/dL (đói)"
        }
      ]
    }
  ]
}
```

## Test Sessions & Measurements

Base path: `/api/test-sessions` – all routes require `Authorization: Bearer <access token>`.

| Method | Path             | Description                               |
|--------|------------------|-------------------------------------------|
| GET    | `/`              | List sessions for signed-in user          |
| POST   | `/`              | Create session with optional measurements |
| GET    | `/:id`           | Retrieve one session + measurements       |
| PUT    | `/:id`           | Update session metadata/measurements      |
| DELETE | `/:id`           | Remove session (cascade delete readings)  |

All endpoints accept an optional `language` query (default `vi`) to localize indicator names/reference text.

### Create Session

```json
POST /api/test-sessions
{
  "label": "Annual Checkup",
  "measuredAt": "2025-01-15",
  "measurements": [
    { "indicatorSlug": "glucose", "value": 95.2 },
    { "indicatorSlug": "hba1c", "value": 5.6 }
  ]
}
```

### Update Session

- Supply only fields you want to change.
- Replacing measurements is optional; when provided, the list is treated as the new source of truth (previous records are removed and reinserted).

```json
PUT /api/test-sessions/12
{
  "label": "Quarterly labs",
  "measurements": [
    { "indicatorSlug": "glucose", "value": 92 }
  ]
}
```

### Response Shape

All session endpoints return:

```json
{
  "session": {
    "id": 12,
    "label": "Annual Checkup",
    "month": 1,
    "year": 2025,
    "measuredAt": "2025-01-15",
    "createdAt": "2025-01-17T04:12:20.000Z",
    "measurements": [
      {
        "id": 30,
        "indicatorId": 5,
        "indicatorSlug": "glucose",
        "indicatorName": "Glucose (Đường huyết)",
        "unit": "mg/dL",
        "value": 95.2,
        "referenceText": "Bình thường: 70-100 mg/dL (đói)",
        "referenceRange": {
          "min": 70,
          "max": 100,
          "male": { "min": 70, "max": 100 },
          "female": { "min": 60, "max": 90 }
        }
      }
    ]
  }
}
```

`GET /api/test-sessions` wraps the same objects inside `{ "sessions": [...] }`.

