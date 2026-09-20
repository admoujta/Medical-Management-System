from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import router as api_router
from app.api.whatsapp import router as whatsapp_router
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models import User
from app.services import subscription_service

app = FastAPI(title=settings.app_name,description="API sécurisée multi-cabinet FADAA Santé pour le web et les applications mobiles.",version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list({settings.frontend_origin,*settings.allowed_cors_origins}),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(whatsapp_router, prefix="/api")

MODULE_PATHS = [
    ("/api/appointments", "appointments"), ("/api/visits", "visits"),
    ("/api/fees", "fees"), ("/api/honoraires", "fees"),
    ("/api/payments", "payments"), ("/api/payment-reminders", "reminders"),
    ("/api/cnss", "cnss"), ("/api/prescriptions", "prescriptions"),
    ("/api/doctor/documents", "documents"), ("/api/documents", "documents"),
    ("/api/doctor/patients", "patients"), ("/api/patients", "patients"),
    ("/api/whatsapp", "whatsapp"),
]


@app.middleware("http")
async def enforce_subscription_modules(request, call_next):
    module = next((code for prefix, code in MODULE_PATHS if request.url.path.startswith(prefix)), None)
    authorization = request.headers.get("authorization", "")
    if module and authorization.lower().startswith("bearer "):
        payload = decode_token(authorization.split(" ", 1)[1])
        if payload and payload.get("sub"):
            with SessionLocal() as db:
                user = db.scalar(select(User).where(User.id == payload["sub"]))
                if user and user.tenant_id:
                    try:
                        subscription_service.require_module(db, user, module)
                    except Exception as exc:
                        if getattr(exc, "status_code", None) == 403:
                            return JSONResponse(status_code=403, content={"detail": exc.detail})
    return await call_next(request)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Bienvenue sur l'API FADAA Sante"}
