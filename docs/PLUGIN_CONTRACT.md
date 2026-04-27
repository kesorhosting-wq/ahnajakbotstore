# Minecraft Plugin Contract

The website/backend does not store reward queue. The future plugin owns delivery.

## Endpoint

`POST /ahnajak/reward`

Header:

`Authorization: Bearer <plugin_api_key>`

Body:

```json
{
  "orderId": "ORD-xxxxx",
  "username": "BlazerxXx",
  "productId": "uuid",
  "productName": "VIP",
  "command": "lp user %player% parent add vip",
  "amount": 5
}
```

## Plugin behavior

- Reject bad API key.
- Reject duplicate orderId.
- Replace `%player%` with username.
- Online player: run commands instantly.
- Offline player: save to `plugins/AhnajakMCStore/data.yml`.
- On join: auto deliver.
- `/check`: manual claim.
