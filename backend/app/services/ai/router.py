"""AI Provider Router with automatic failover, circuit breaker tracking, and execution metadata."""

import logging
import time
from typing import Any, Dict, List, Optional, Tuple, Type
from pydantic import BaseModel
from app.config import get_settings
from app.models.vault import AIMetadata
from app.services.ai.base import BaseLLMProvider
from app.services.ai.circuit_breaker import get_circuit_breaker
from app.services.ai.gemini_provider import GeminiProvider
from app.services.ai.openai_compatible_provider import OpenAICompatibleProvider

logger = logging.getLogger(__name__)


class AIRouter:
    """Manages AI providers and executes requests with automatic fallback and telemetry."""

    def __init__(
        self,
        gemini_provider: Optional[GeminiProvider] = None,
        openai_provider: Optional[OpenAICompatibleProvider] = None,
    ):
        settings = get_settings()
        self.providers: Dict[str, BaseLLMProvider] = {
            "gemini": gemini_provider or GeminiProvider(),
            "openai_compatible": openai_provider or OpenAICompatibleProvider(),
        }
        self.primary_name = settings.ai_primary_provider
        self.fallback_name = settings.ai_fallback_provider
        self.circuit_breaker = get_circuit_breaker()

    def get_provider(self, name: str) -> Optional[BaseLLMProvider]:
        return self.providers.get(name)

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        preferred_provider: Optional[str] = None,
        **kwargs: Any,
    ) -> Tuple[str, AIMetadata]:
        """Generate text with auto-failover and complete execution telemetry."""
        start_time = time.perf_counter()
        provider_order: List[str] = []
        if preferred_provider and preferred_provider in self.providers:
            provider_order.append(preferred_provider)
        if self.primary_name not in provider_order and self.primary_name in self.providers:
            provider_order.append(self.primary_name)
        if self.fallback_name not in provider_order and self.fallback_name in self.providers:
            provider_order.append(self.fallback_name)

        reasons: List[str] = []
        fallback_occurred = False
        last_error: Optional[Exception] = None

        for idx, name in enumerate(provider_order):
            provider = self.providers[name]
            try:
                is_avail = await provider.is_available()
                if not is_avail:
                    reasons.append(f"Provider '{name}' is offline or all models circuit-broken")
                    logger.warning("Provider '%s' is unavailable. Skipping.", name)
                    fallback_occurred = True
                    continue

                if idx > 0:
                    fallback_occurred = True

                logger.info("Generating text using provider '%s'...", name)
                result = await provider.generate_text(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    **kwargs,
                )

                duration_ms = int((time.perf_counter() - start_time) * 1000)

                # Determine model name and internal fallback telemetry
                if isinstance(provider, GeminiProvider):
                    model_name = provider.last_model_used or provider.primary_model
                    if provider.last_fallback_occurred:
                        fallback_occurred = True
                        if provider.last_fallback_reason:
                            reasons.append(provider.last_fallback_reason)
                else:
                    model_name = getattr(provider, "model", name)

                metadata = AIMetadata(
                    provider=name,
                    model=model_name,
                    fallback_occurred=fallback_occurred,
                    fallback_reason="; ".join(reasons) if reasons else None,
                    duration_ms=duration_ms,
                )
                return result, metadata
            except Exception as e:
                logger.warning("Provider '%s' failed: %s. Attempting fallback.", name, e)
                reasons.append(f"{name} error: {e}")
                fallback_occurred = True
                last_error = e

        raise RuntimeError(
            f"All AI providers failed. Attempted: {provider_order}. Reasons: {reasons}. Last error: {last_error}"
        )

    async def generate_structured(
        self,
        prompt: str,
        schema: Optional[Type[BaseModel]] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        preferred_provider: Optional[str] = None,
        **kwargs: Any,
    ) -> Tuple[Dict[str, Any], AIMetadata]:
        """Generate structured JSON with auto-failover and complete execution telemetry."""
        start_time = time.perf_counter()
        provider_order: List[str] = []
        if preferred_provider and preferred_provider in self.providers:
            provider_order.append(preferred_provider)
        if self.primary_name not in provider_order and self.primary_name in self.providers:
            provider_order.append(self.primary_name)
        if self.fallback_name not in provider_order and self.fallback_name in self.providers:
            provider_order.append(self.fallback_name)

        reasons: List[str] = []
        fallback_occurred = False
        last_error: Optional[Exception] = None

        for idx, name in enumerate(provider_order):
            provider = self.providers[name]
            try:
                is_avail = await provider.is_available()
                if not is_avail:
                    reasons.append(f"Provider '{name}' is offline or all models circuit-broken")
                    logger.warning("Provider '%s' is unavailable. Skipping.", name)
                    fallback_occurred = True
                    continue

                if idx > 0:
                    fallback_occurred = True

                logger.info("Generating structured output using provider '%s'...", name)
                result = await provider.generate_structured(
                    prompt=prompt,
                    schema=schema,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    **kwargs,
                )

                duration_ms = int((time.perf_counter() - start_time) * 1000)

                # Determine model name and internal fallback telemetry
                if isinstance(provider, GeminiProvider):
                    model_name = provider.last_model_used or provider.primary_model
                    if provider.last_fallback_occurred:
                        fallback_occurred = True
                        if provider.last_fallback_reason:
                            reasons.append(provider.last_fallback_reason)
                else:
                    model_name = getattr(provider, "model", name)

                metadata = AIMetadata(
                    provider=name,
                    model=model_name,
                    fallback_occurred=fallback_occurred,
                    fallback_reason="; ".join(reasons) if reasons else None,
                    duration_ms=duration_ms,
                )
                return result, metadata
            except Exception as e:
                logger.warning("Provider '%s' structured generation failed: %s. Attempting fallback.", name, e)
                reasons.append(f"{name} error: {e}")
                fallback_occurred = True
                last_error = e

        raise RuntimeError(
            f"All AI providers failed. Attempted: {provider_order}. Reasons: {reasons}. Last error: {last_error}"
        )

    async def get_status(self) -> Dict[str, Any]:
        """Check status of all configured providers, models, and circuit breakers."""
        status = {}
        for name, provider in self.providers.items():
            avail = await provider.is_available()
            prov_info: Dict[str, Any] = {
                "available": avail,
                "is_primary": name == self.primary_name,
                "is_fallback": name == self.fallback_name,
            }
            if isinstance(provider, GeminiProvider):
                prov_info["cascade"] = provider.model_cascade
                prov_info["active_model"] = provider.last_model_used or provider.primary_model
            elif isinstance(provider, OpenAICompatibleProvider):
                prov_info["model"] = provider.model
            status[name] = prov_info

        circuit_status = self.circuit_breaker.get_status()
        return {
            "providers": status,
            "circuit_breaker": {
                "has_tripped_models": bool(circuit_status),
                "tripped_models": circuit_status,
            },
        }
