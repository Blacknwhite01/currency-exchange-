# Currency Exchange

A currency converter and exchange-rate analytics web app: live conversion between 160+ currencies,
historical trend charts, multi-currency comparison, daily movement, favorites and recent conversions,
in a light glassmorphism interface.

| Layer    | Technology                                                   |
|----------|--------------------------------------------------------------|
| Frontend | React 18, Vite, React Router, Recharts, flag-icons, plain CSS |
| Backend  | Java 21+, Spring Boot 4, Spring Data JPA, Bean Validation     |
| Database | MySQL 8 (H2 profile available for running without MySQL)     |
| Rates    | [ExchangeRate-API](https://www.exchangerate-api.com) — open access by default, API key optional |

## Project structure

```
currency-exchange/
├── backend/                 Spring Boot REST API
│   └── src/main/java/com/currencyx/
│       ├── controller/      REST endpoints
│       ├── service/         conversion, rate caching, history, demo data
│       ├── client/          ExchangeRate-API integration
│       ├── repository/      JPA repository + JDBC batch writer
│       ├── entity/          RateSnapshot
│       ├── dto/             request/response records
│       ├── config/          properties, CORS, scheduling
│       └── exception/       consistent JSON error responses
├── frontend/                React single-page app
│   └── src/
│       ├── pages/           Dashboard, Converter, Analytics
│       ├── components/      converter, currency picker, lists, states
│       ├── charts/          trend + comparison charts
│       ├── context/         shared data, favorites, recents
│       └── lib/             API client, formatting, local storage
└── database/schema.sql      reference MySQL schema
```

## Running locally

### Prerequisites

- JDK 21 or newer (`java -version`)
- Node.js 20 or newer (`node -v`)
- MySQL 8 running locally — or skip it and use the H2 profile below

Maven does not need to be installed; the backend includes the Maven wrapper (`mvnw` / `mvnw.cmd`).

### 1. Start the backend

```powershell
cd backend
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "your-mysql-password"
.\mvnw.cmd spring-boot:run
```

(macOS/Linux: `export DB_PASSWORD=...` then `./mvnw spring-boot:run`.)

The database `currency_exchange` and its table are created automatically. On startup the backend
fetches the latest rates, stores them, and (by default) seeds demo history. The API listens on
<http://localhost:8080>.

**No MySQL?** Run with the file-based H2 profile instead:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2"
```

### 2. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to the backend.

### Configuration

All settings live in `backend/src/main/resources/application.properties` and can be overridden with
environment variables (see `.env.example`):

| Variable                | Default                    | Purpose |
|-------------------------|----------------------------|---------|
| `DB_URL`                | local MySQL `currency_exchange` | JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / empty       | MySQL credentials |
| `EXCHANGE_RATE_API_KEY` | empty                      | Use the keyed v6 endpoint instead of open access |
| `DEMO_DATA_ENABLED`     | `true`                     | Seed / remove labelled synthetic history |
| `CORS_ORIGINS`          | `http://localhost:5173`    | Origins allowed to call the API directly |

The API key is only ever read by the backend; it is never sent to the browser or written to logs.

## Tests

```powershell
cd backend;  .\mvnw.cmd test     # 36 tests: BigDecimal maths, validation, caching, persistence, API
cd frontend; npm test            # 14 tests: amount validation, formatting, favorites/recents storage
```

The backend integration tests run the full HTTP stack against an in-memory H2 database with a stub
rate provider and a controllable clock, so they need neither MySQL nor network access.

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/currencies` | Supported currencies with names, symbols, flags (popular first) |
| GET | `/api/rates/latest?base=USD` | Latest rates against any base |
| GET | `/api/convert?from=USD&to=INR&amount=100` | Server-side conversion with rate, inverse rate and freshness |
| GET | `/api/history?from=USD&to=INR&period=1M` | Stored observations for a pair (`1D`, `1W`, `1M`, `1Y`) |
| GET | `/api/analytics/compare?base=USD&symbols=INR,EUR,GBP&period=1M` | Up to 5 series, with % change from period start |
| GET | `/api/analytics/change?from=USD&to=INR` | Previous vs latest daily observation |
| GET | `/api/status` | Provider status, last fetch, recorded history, demo-data flag |

Errors always use one shape: `{ "status": 400, "code": "INVALID_AMOUNT", "message": "...", "timestamp": "..." }`.

## How the data works

- **Conversion** — `converted = amount × targetRate ÷ sourceRate`, computed with `BigDecimal`
  (34 significant digits) on the server. The API returns 8 decimal places; the UI rounds only for display.
- **Fetching** — rates are fetched at startup and re-checked hourly, but the provider is only called
  once its published *next update* time has passed. User requests never trigger extra provider calls.
  After a failure the backend waits 5 minutes before retrying.
- **Failures** — if a refresh fails (network, quota, bad response), the last valid rates are served and
  marked **stale** with an explanation; nothing is invented. With no data at all, a clear 503 error is shown.
- **History** — every provider publication is stored once per currency per day in `rate_snapshot`
  (unique on base, target and date), dated by the provider's own timestamp. All rates are stored against
  USD; other pairs are cross-calculated. Charts plot only stored observations; gaps longer than two days
  break the line.
- **Free-plan limitation** — the open endpoint updates once per day and offers no historical endpoint,
  so real history accumulates one point per day from the first run.
- **Demo data** — so the charts can be demonstrated immediately, the app seeds 365 days of synthetic
  history *before* the first real observation. It is stored with `source = DEMO`, drawn as dashed grey
  lines, tagged "Demo" in tables and tooltips, and called out in notices. Set `DEMO_DATA_ENABLED=false`
  and restart to remove it.

## Browser storage

Favorites, the last 20 conversions and the last used pair are kept in `localStorage`. They are specific
to the current browser, survive refreshes, and are never sent to the server.

## Disclaimer

Rates are indicative estimates for informational use and may differ from the rate applied by a bank,
card provider or exchange service. The application does not execute financial transactions.
