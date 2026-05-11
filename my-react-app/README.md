## Про проєкт

StreetCourts — навчальний вебзастосунок на React + Vite для пошуку вуличних спортивних майданчиків у Києві. Данні про баскетбольні поля підтягуються з OpenStreetMap через Overpass API, після чого застосунок показує список майданчиків, сторінку конкретного майданчика.

## Проблема яку вирішує цей застосунок

Якщо ти хочешь пограти на площадці в баскетбол волейбол або футбол то доволі часто буває, що немає людей. Завдяки цьому застосунку ти будеш знати на якій площадці є люди і скільки їх.

## Запуск (dev)

- Запустити застосунок разом з JSON API для коментарів: `npm run dev`
- Запустити тільки Vite: `npm run dev:vite`
- Запустити тільки сервер коментарів: `npm run dev:comments`

## Task 8: Authentication Proxy для API майданчиків

Утиліта auth proxy підключена до API майданчиків у `src/utils/courtsApi.js`.

Підтримувані методи:

- `JWT`
- `OAUTH`
- `API_KEY`

Налаштування через `.env`:

- `VITE_COURTS_API_AUTH_METHOD` (`JWT`, `OAUTH`, `API_KEY`)
- `VITE_COURTS_API_TOKEN` (для `JWT`/`OAUTH`)
- `VITE_COURTS_API_TOKEN_TYPE` (за замовчуванням `Bearer`)
- `VITE_COURTS_API_AUTH_HEADER` (за замовчуванням `Authorization`)
- `VITE_COURTS_API_KEY` (для `API_KEY`)
- `VITE_COURTS_API_KEY_HEADER` (за замовчуванням `x-api-key`)
- `VITE_COURTS_API_KEY_QUERY_PARAM` (опційно, якщо API key треба передавати як query param)
- `VITE_COURTS_API_REFRESH_URL` (опційно, endpoint для auto-refresh токена при `401`)
- `VITE_COURTS_API_RATE_LIMIT_REQUESTS` (опційно, ліміт запитів за вікно)
- `VITE_COURTS_API_RATE_LIMIT_WINDOW_MS` (опційно, тривалість вікна в мс)
- `VITE_COURTS_API_LOGGING` (`false`, щоб вимкнути логування)

Динамічна зміна стратегії під час runtime:

- `configureCourtsApiAuth(strategy)`
- `setCourtsApiAuthMethod(method, credential, options)`

Метрики проксі:

- `getCourtsApiProxyMetrics()`
- `resetCourtsApiProxyMetrics()`