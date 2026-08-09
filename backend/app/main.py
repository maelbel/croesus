from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    accounts,
    assets,
    dashboard,
    envelopes,
    liabilities,
    valuations,
)
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Croesus API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router)
app.include_router(valuations.router)
app.include_router(assets.router)
app.include_router(liabilities.router)
app.include_router(envelopes.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
