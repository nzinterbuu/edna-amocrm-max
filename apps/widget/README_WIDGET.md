# amoCRM widget package (install-safe mode)

Цель этого режима — **успешная установка** виджета в amoCRM (`widget.zip` без общей ошибки «Что-то пошло не так»). Рендер и бизнес-функции откатываются до минимума.

## Что упрощено ради совместимости

| Элемент | Было / риск | Сейчас |
|--------|---------------|--------|
| `locations` | `["settings", "everywhere"]` — `everywhere` может быть не поддержан | только **`["settings"]`** |
| `widget.code` | длинное имя | **`edna_max_widget`** (латиница, цифры, underscore) |
| `manifest` | `support`, `is_showcase`, `init_once`, `short_description`, блок `settings` | убраны; остаются поля, обычно достаточные для базовой установки |
| `script.js` | DOM, `AMOCRM`, jQuery-селекторы | только **callbacks + `return true`**, без манипуляций DOM |
| `i18n` | большие деревья ключей | только **`widget.name` / `widget.description` / `widget.short_description`** |

## Что можно вернуть после стабильной установки

1. **`locations`**: добавить снова `"everywhere"` **только если** подтверждено в [документации виджета](https://www.amocrm.ru/developers/content/integrations/structure) для вашего типа интеграции.
2. **`widget.settings`**: поле `backend_url` (и др.) — когда установка проходит стабильно.
3. **`support`**: link/email — по требованиям модерации/маркетплейса.
4. **`script.js`**: экран настроек (`.widget-settings__body`), bootstrap с backend, `widget_code` / work-area — см. историю коммитов проекта.

## Сборка `widget.zip`

Из корня репозитория:

```bash
node scripts/build-widget-zip.js
```

Архив: `apps/widget/widget.zip`.

**Структура внутри zip** (файлы в корне, без папки `widget/`):

```text
manifest.json
script.js
i18n/ru.json
i18n/en.json
```

## Примечание про `widget.name` в manifest

В manifest указаны строки `"widget.name"` и `"widget.description"` — это **ключи локализации**; подстановка из `i18n/*.json` выполняет amoCRM.
