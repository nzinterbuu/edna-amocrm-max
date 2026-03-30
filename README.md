# MAX Bot ↔ amoCRM Inbox (edna Pulse)

Production-oriented MVP: **amoCRM widget** (настройка и диагностика) + **NestJS backend** (OAuth, Chats API, подпись, webhooks, маршрутизация в MAX через edna Pulse).

## Шаг 1 — кратко по спекам

| Область | Содержание |
|--------|------------|
| Архитектура | Виджет → только backend → `amojo.amocrm.ru` (Chats API) и `app.edna.ru` (outbound MAX); подпись и секреты только на сервере. |
| Сущности БД | `installations`, `edna_tenants`, `channel_connections`, `conversation_mappings`, `message_mappings`, `webhook_logs`, `integration_errors`. |
| Внешние API | amoCRM OAuth; `GET /api/v4/account?with=amojo_id`; `POST/DELETE /v2/origin/custom/{channel_id}/connect|disconnect`; `POST /v2/origin/custom/{scope_id}`; webhooks Chat API v2; edna `POST /api/v1/out-messages/max-bot` с `X-API-KEY`. |
| Endpoints backend | `GET /api/integrations/amocrm/oauth/callback`, `GET /api/widget/bootstrap`, `POST /api/edna/session/bind`, `GET /api/edna/max-bots`, `POST /api/channel-connections`, `POST /api/channel-connections/:id/disconnect`, `POST /api/webhooks/max/:connection_id`, `POST /api/webhooks/amocrm/:scope_id`, `GET /api/channel-connections/:id/health`. |

Источники истины: техспека; outbound MAX — manifest «MAX Bot send message»; inbound MAX — manifest «MAX Bot Incoming» (только `TEXT`). Для полей amoCRM при расхождениях с техспекой приоритет у [официальной документации](https://www.amocrm.ru/developers/content/chats/chat-api-reference).

## Требования

- Node.js 20+
- PostgreSQL 14+

## Установка backend

```bash
cd services/api
npm install
cp ../../.env.example ../../.env
# отредактируйте .env — DATABASE_URL, amoCRM, edna, APP_BASE_URL
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

### Переменные окружения

См. корневой `.env.example`. Важно:

- `AMOCRM_REDIRECT_URI` — точно как в настройках интеграции amoCRM.
- `AMOCRM_CHANNEL_ID` / `AMOCRM_CHANNEL_SECRET` — зарегистрированный у amoCRM кастомный канал.
- `EDNA_PULSE_SENDER` — идентификатор канала‑отправителя для edna (см. manifest); иначе в коде используется `max_bot_id` подключения.
- В amoCRM в настройках канала укажите URL webhook исходящих сообщений: `{APP_BASE_URL}/api/webhooks/amocrm/{scope_id}` для каждого `scope_id` после подключения (или единый шаблон, если так настроено у провайдера).

## Виджет amoCRM

Файлы: `apps/widget/` (`manifest.json`, `script.js`, `i18n/`). Подробности и режим **install-safe**: `apps/widget/README_WIDGET.md`.

Сборка `widget.zip` (корень архива — `manifest.json`, `script.js`, папка `i18n/`):

```bash
node scripts/build-widget-zip.js
```

Либо из `apps/widget`: `zip -r widget.zip manifest.json script.js i18n` (Linux/macOS).

Redirect URI интеграции в amoCRM: `https://<ваш-backend>/api/integrations/amocrm/oauth/callback`.

После установки виджета: OAuth создаёт запись `installation`. Затем в UI виджета: привязка edna (заглушка обмена кода — см. `TODO` в `EdnaSessionService`), создание `channel connection` (вызов `POST /v2/origin/custom/{channel_id}/connect`, сохранение `scope_id`).

## Webhooks для тестов

**Inbound MAX (edna Pulse → backend):**  
`POST {APP_BASE_URL}/api/webhooks/max/{connection_id}`  
Тело — структура из «MAX Bot Incoming» (`messageContent.type === "TEXT"` и т.д.). При заданном `MAX_WEBHOOK_SECRET` — заголовок `Authorization: Bearer <secret>`.

**Outbound amoCRM (оператор → backend):**  
`POST {APP_BASE_URL}/api/webhooks/amocrm/{scope_id}`  
Сырое тело как от Chat API v2; заголовок `X-Signature`: HMAC-SHA1 от raw body с `AMOCRM_CHANNEL_SECRET` (как в доке chat-webhooks).

## Структура репозитория

```text
apps/widget/          — виджет
services/api/         — NestJS + Prisma
  src/modules/amocrm  — OAuth, chat client, подпись, проверка webhook
  src/modules/edna    — outbound клиент, парсер inbound MAX
  src/modules/messages — маршрутизация MAX ↔ amoCRM
  src/modules/webhooks — контроллеры webhooks
  prisma/             — схема и миграции
```

## Ограничения MVP / TODO

- Список MAX ботов edna: заглушка до появления документированного list API (`EdnaMaxBotsService`).
- Привязка edna по коду: нет реального обмена с Pulse — заменить в `EdnaSessionService`.
- Статусы доставки в amoCRM: каркас `DeliveryStatusService` + `TODO` по полям ответа.
- Подпись amoCRM webhook: при отличии алгоритма от доки — поправить `AmocrmWebhookValidator`.
- Виджет: области DOM и `widget_code` — сверить с [структурой виджета](https://www.amocrm.ru/developers/content/integrations/structure).

## Лицензия

MIT (при необходимости уточните у правообладателя проекта).
