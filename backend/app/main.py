from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.data.seed_data import seed_database_if_empty

# Routers
from backend.app.api.agents import router as agents_router
from backend.app.api.policies import router as policies_router
from backend.app.api.gateway import router as gateway_router
from backend.app.api.actions import router as actions_router
from backend.app.api.decisions import router as decisions_router
from backend.app.api.approvals import router as approvals_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.baselines import router as baselines_router
from backend.app.api.models import router as models_router
from backend.app.api.feedback import router as feedback_router
from backend.app.api.metrics import router as metrics_router
from backend.app.api.audit import router as audit_router

# Ensure tables exist immediately on import
Base.metadata.create_all(bind=engine)
db_init = SessionLocal()
try:
    seed_database_if_empty(db_init)
finally:
    db_init.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Identity Drift Detection & Pre-execution Security Gateway for Autonomous AI Agents",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root liveness & readiness
@app.get("/api/v1/health")
def health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "mode": "shadow" if settings.SHADOW_MODE else "enforcing",
        "degraded": settings.DEGRADED_MODE
    }

@app.get("/api/v1/ready")
def ready():
    return {
        "status": "ready",
        "database": "connected",
        "risk_engine": "operational",
        "version": "1.0.0"
    }

# Register Routers
app.include_router(gateway_router, prefix=settings.API_V1_STR)
app.include_router(agents_router, prefix=settings.API_V1_STR)
app.include_router(policies_router, prefix=settings.API_V1_STR)
app.include_router(actions_router, prefix=settings.API_V1_STR)
app.include_router(decisions_router, prefix=settings.API_V1_STR)
app.include_router(approvals_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(baselines_router, prefix=settings.API_V1_STR)
app.include_router(models_router, prefix=settings.API_V1_STR)
app.include_router(feedback_router, prefix=settings.API_V1_STR)
app.include_router(metrics_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
