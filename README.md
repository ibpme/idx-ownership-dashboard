# IDX Ownership

## Production Docker

Multi-stage Docker build that bundles:
- Client `dist`
- Go server
- SQLite DB generated from PDFs

### Build and run (single container)

```sh
docker build -t idx-ownership .
docker run --rm -p 8080:8080 idx-ownership
```

### Production with Caddy (TLS + compression)

```sh
DOMAIN=your.domain.com docker compose -f docker-compose.prod.yml up --build
```

If `DOMAIN` is not set, it will default to `localhost`.
