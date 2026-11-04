# Production Deployment

This deploys the API, PostgreSQL, and Redis on one Linux server with Docker Compose. PostgreSQL data, Redis data, and uploaded files are stored in Docker volumes and survive container replacement.

## 1. Prepare the server

Use a supported Linux server with Docker Engine and the Docker Compose plugin installed. Make sure the server has enough disk space for database backups and uploads.

From the server, clone the repository:

```bash
git clone https://github.com/yared098/delivery_ethiopai_backend.git
cd delivery_ethiopai_backend
```

If you already cloned the repository, `cd` into its root directory instead.

## 2. Configure production secrets

Create the environment file and generate unique secrets:

```bash
cp .env.example .env
chmod 600 .env
openssl rand -hex 24
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Edit `.env` on the server:

```bash
nano .env
```

Replace `POSTGRES_PASSWORD` with the first generated value, and use the next four values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `QR_SECRET`, and `TRACKING_SECRET` respectively. Keep the four application secrets different. Also set the password in `DATABASE_URL` to the same PostgreSQL password if you will run the API directly on the host. Compose overrides `DATABASE_URL` and `REDIS_URL` inside the API container to use the internal service names. Set the Firebase project ID, service-account email, and private key; the API will not start without valid Firebase credentials. In `.env`, represent private-key line breaks as `\n`.

Set the public URLs for your server and frontend, and configure SMS/Google credentials if those integrations are used. Do not commit or share `.env`. Use a PostgreSQL password containing only hexadecimal characters because Compose places it into the database URL.

## 3. Start the database and Redis

```bash
docker compose pull postgres redis
docker compose up -d postgres redis
docker compose ps
```

Wait until both services show `healthy` before continuing.

## 4. Build the API and apply migrations

```bash
docker compose build api
docker compose run --rm api ./node_modules/.bin/prisma migrate deploy
```

Run migrations again after deploying a release that introduces new Prisma migrations.

## 5. Start the API

```bash
docker compose up -d api
docker compose ps
docker compose logs --tail=100 api
```

The API listens on port `3000` inside Docker and on the host port set by `PORT` in `.env`. Its API base path is `/api/v1`. Configure your DNS and HTTPS reverse proxy (for example, Nginx or Caddy) to forward requests to `127.0.0.1:3000`. Restrict public firewall access to the ports your proxy needs; do not expose PostgreSQL or Redis directly to the internet.

## 6. Create the Super Admin (once)

Set `SUPER_ADMIN_PHONE` and optionally `SUPER_ADMIN_NAME` in `.env`, then run:

```bash
docker compose run --rm api ./node_modules/.bin/ts-node prisma/seed.ts
```

This creates or upgrades the staff account in the production database. If a Super Admin already exists, the seed skips creation. Sign in using the configured phone number and the OTP flow.

## Deploy an update

Run these commands from the repository root after updating the checkout:

```bash
git pull
docker compose build api
docker compose run --rm api ./node_modules/.bin/prisma migrate deploy
docker compose up -d api
docker compose ps
docker compose logs --tail=100 api
```

## Useful operations

```bash
# Follow API logs
docker compose logs -f api

# Restart the API
docker compose restart api

# Stop services without deleting persistent data
docker compose down
```

Back up PostgreSQL regularly and store the backup off the server:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backup-$(date +%F-%H%M%S).sql"
```

The `postgres_data`, `redis_data`, and `uploads_data` volumes persist across `docker compose down` and container rebuilds. Do not use `docker compose down -v` unless you intend to permanently delete the database, Redis data, and uploaded files.
