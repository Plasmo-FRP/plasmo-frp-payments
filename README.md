# Plasmo FullRP Payments

## Установка

```bash
npm ci
npm run prod
```

## Функции

### Дискорд логгер через вебхук

Пишет логи в канал в дискорде. По умолчанию, отправляет либо каждые 10 секунд, либо каждые 0.5, если в сообщении больше 120 символов.

### Веб-сервер для просмотра информации платежей

Порт по умолчанию: 4488

GET / - возвращает привет

GET /payments/last - возвращает сводку платежей с начало настоящего месяца

GET /payments/past- возвращает сводку платежей с начало прошлого месяца