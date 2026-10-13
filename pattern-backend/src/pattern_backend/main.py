from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import health, patterns

app = FastAPI(title="Patternly API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(patterns.router, prefix="/api")