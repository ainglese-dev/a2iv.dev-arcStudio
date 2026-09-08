"""Health and status check router with circuit breaker inspection."""

from typing import Optional
from fastapi import APIRouter, Query
from app.config import get_settings
from app.services.ai.circuit_breaker import get_circuit_breaker
from app.services.ai.router import AIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def health_check():
    """Basic healthcheck endpoint."""
    settings = get_settings()
    return {
        "status": "healthy",
        "service": "Fact Vault & Context Extender",
        "vault_dir": str(settings.resolved_vault_dir),
    }


@router.get("/providers")
async def provider_status():
    """Check AI provider availability, model cascade, and circuit breaker status."""
    ai_router = AIRouter()
    status_data = await ai_router.get_status()
    settings = get_settings()
    return {
        "primary_provider": settings.ai_primary_provider,
        "fallback_provider": settings.ai_fallback_provider,
        "providers": status_data["providers"],
        "circuit_breaker": status_data["circuit_breaker"],
    }


@router.post("/circuit-breaker/reset")
async def reset_circuit_breaker(
    identifier: Optional[str] = Query(None, description="Specific model to reset, or empty to reset all")
):
    """Reset tripped circuit breakers for a specific model or all models."""
    cb = get_circuit_breaker()
    cb.reset(identifier)
    return {
        "status": "reset",
        "identifier": identifier or "all",
        "current_circuit_status": cb.get_status(),
    }
