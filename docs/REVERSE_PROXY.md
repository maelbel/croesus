# Reverse proxy setup

`docker-compose.yml` publishes the frontend on `8080` and the backend API on
`8000` directly — enough to get started, but not something you'd expose to
the internet as-is (no TLS, no real hostnames). Putting a reverse proxy in
front handles TLS termination and lets you serve both services under real
domains.

This is entirely your call as the deployer — Croesus doesn't ship a proxy or
assume one. You add it via `docker-compose.override.yml`, a file Docker
Compose merges on top of `docker-compose.yml` automatically and that's
already gitignored (see `.gitignore`), so proxy config with your real
domains never risks landing in a commit.

## The two hosts you're routing

Whichever proxy you use, you're routing **two separate hostnames** to two
separate services:

- a **frontend** host (e.g. `app.example.com`) → the `frontend` container,
  port `80` internally
- an **API** host (e.g. `api.example.com`) → the `backend` container, port
  `8000`

Two hosts, not one host with a `/api` path prefix — the frontend's nginx
doesn't proxy API paths itself, and splitting them this way keeps CORS and
the desktop app's "Remote" connection setup simple (point it at the API
host, not the frontend host — see the README's Desktop section).

Two env vars need to reflect whatever hostnames you pick:

- `CORS_ORIGINS` (backend) — must include your frontend's public origin,
  e.g. `["https://app.example.com"]`. If you also want the desktop app's
  remote mode to work against this instance, keep `tauri://localhost` and
  `http://tauri.localhost` in the list too — it's easy to drop them by
  accident when overriding this for a custom domain.
- `VITE_API_URL` (frontend build arg, not a runtime env var — it's baked in
  at `docker compose build` time) — your API's public origin, e.g.
  `https://api.example.com`.

Both are set via `docker-compose.override.yml` in the examples below, so
`docker compose up -d --build` picks them up.

## Traefik

Assumes Traefik is already running elsewhere on the host (its own compose
project) with the Docker provider enabled, watching an external network
named `proxy`, and a certresolver named `le` configured for Let's Encrypt.
Adjust the certresolver name and entrypoint to match your own Traefik setup.

```yaml
# docker-compose.override.yml
services:
  backend:
    ports: !reset []
    environment:
      CORS_ORIGINS: '["https://app.example.com","tauri://localhost","http://tauri.localhost"]'
    networks:
      - proxy
    labels:
      - traefik.enable=true
      - traefik.docker.network=proxy
      - traefik.http.services.croesus-api.loadbalancer.server.port=8000
      - traefik.http.routers.croesus-api.rule=Host(`api.example.com`)
      - traefik.http.routers.croesus-api.entrypoints=websecure
      - traefik.http.routers.croesus-api.tls=true
      - traefik.http.routers.croesus-api.tls.certresolver=le

  frontend:
    build:
      args:
        VITE_API_URL: https://api.example.com
    ports: !reset []
    networks:
      - proxy
    labels:
      - traefik.enable=true
      - traefik.docker.network=proxy
      - traefik.http.services.croesus.loadbalancer.server.port=80
      - traefik.http.routers.croesus.rule=Host(`app.example.com`)
      - traefik.http.routers.croesus.entrypoints=websecure
      - traefik.http.routers.croesus.tls=true
      - traefik.http.routers.croesus.tls.certresolver=le

networks:
  proxy:
    external: true
```

`ports: !reset []` drops the host port publishing from the base compose
file — with Traefik reaching the containers over the shared `proxy` Docker
network, there's no need to also expose `8080`/`8000` on the host. Create
the external network once with `docker network create proxy` if Traefik
doesn't already manage it.

## Caddy

Caddy doesn't do label-based discovery out of the box (that needs the
`caddy-docker-proxy` plugin), so this runs Caddy as its own service in the
override, reading a `Caddyfile` you provide. Caddy handles Let's Encrypt
automatically — no certresolver config needed.

```yaml
# docker-compose.override.yml
services:
  backend:
    ports: !reset []
    environment:
      CORS_ORIGINS: '["https://app.example.com","tauri://localhost","http://tauri.localhost"]'
    networks:
      - internal

  frontend:
    build:
      args:
        VITE_API_URL: https://api.example.com
    ports: !reset []
    networks:
      - internal

  caddy:
    image: caddy:2-alpine
    container_name: croesus-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    networks:
      - internal

volumes:
  caddy_data:
```

```caddyfile
# Caddyfile
app.example.com {
    reverse_proxy frontend:80
}

api.example.com {
    reverse_proxy backend:8000
}
```

`frontend` and `backend` resolve by service name because Caddy joins the
same `internal` network the base compose file already defines — no need for
a separate external network here, unlike the Traefik example.

## nginx

Unlike Traefik/Caddy, nginx here runs directly on the host (not
containerized) — the most common way people already have nginx set up for
other services. It proxies to the ports `docker-compose.yml` publishes by
default, so no override file or `!reset` is needed; just point DNS for both
hostnames at this host and get certificates however you normally do (e.g.
`certbot --nginx`).

```nginx
# /etc/nginx/sites-available/croesus
server {
    listen 443 ssl;
    server_name app.example.com;

    # ssl_certificate / ssl_certificate_key — see certbot, or your existing setup

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name api.example.com;

    # ssl_certificate / ssl_certificate_key — see certbot, or your existing setup

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Set `CORS_ORIGINS` and `VITE_API_URL` the same way as the other examples —
still via `docker-compose.override.yml` (just without the `ports: !reset []`
or proxy network/labels, since nginx here reaches the containers through
the host ports rather than a shared Docker network):

```yaml
# docker-compose.override.yml
services:
  backend:
    environment:
      CORS_ORIGINS: '["https://app.example.com","tauri://localhost","http://tauri.localhost"]'

  frontend:
    build:
      args:
        VITE_API_URL: https://api.example.com
```

Then reload nginx (`nginx -t && systemctl reload nginx`) and rebuild Croesus
(`docker compose up -d --build`) to pick up the new `VITE_API_URL`.
