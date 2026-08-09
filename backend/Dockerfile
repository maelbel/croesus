FROM python:3.13-slim AS base

RUN pip install --no-cache-dir uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# --- development: live-reload, code comes from a bind mount ---
FROM base AS development
COPY . .
RUN uv sync --frozen
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# --- production: code baked into the image ---
FROM base AS production
COPY . .
RUN uv sync --frozen
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
