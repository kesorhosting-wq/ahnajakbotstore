# Plugin Contract Later

Website/backend does NOT store offline reward queue.

Correct final flow:

1. Order paid in KHQR.
2. Backend marks order `paid` in Supabase.
3. Later backend sends paid order ONCE to plugin endpoint.
4. Plugin checks API key from config.yml.
5. If player online, plugin gives instantly.
6. If player offline, plugin saves pending reward in `plugins/AhnajakMCStore/data.yml`.
7. On join or `/check`, plugin gives pending reward and marks local delivery complete.

Backend order status only tracks payment + whether plugin was notified.
Plugin is source of truth for reward delivery.

Example future plugin endpoint:

POST /ahnajakmc/reward
Authorization: Bearer <plugin_api_key>

```json
{
  "orderId": "ORD-XXX",
  "username": "BlazerxXx",
  "productId": "uuid",
  "productName": "VIP",
  "commands": [
    "lp user %player% parent add vip",
    "crate key give %player% vip 3"
  ]
}
```
