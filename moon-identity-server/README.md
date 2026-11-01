# Moon Identity Service

This service stores Moon account titles and supplies the Ely/Minecraft UUID profile used by the launcher and server.

## Secret setup

Never put `devhimamking88` in launcher code or Git. Store its SHA-256 hash:

```sh
printf '%s' 'devhimamking88' | sha256sum
```

Set the 64-character result as `MOON_DEVELOPER_KEY_SHA256`. The old key should be rotated before deployment.

## API

- `POST /v1/developer/login` - validates the developer key and returns a short-lived Bearer token.
- `GET /v1/profiles/:uuid` - returns public nickname/title/prefix data.
- `GET /v1/profiles` - developer-only profile list.
- `POST /v1/profiles` - developer-only create/update.

Deploy behind HTTPS on `api.alwination.id`. Data is persisted in the Docker volume and must not be represented as client-side credentials.
