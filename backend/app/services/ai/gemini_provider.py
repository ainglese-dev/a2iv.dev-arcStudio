"""Google GenAI (Gemini) LLM Provider implementation with model cascading, sticky circuit breaker, and retries."""

import asyncio
import json
import logging
import re
from typing import Any, Callable, Dict, List, Optional, Type
from google import genai
from google.genai import types
from pydantic import BaseModel
from app.config import get_settings
from app.services.ai.base import BaseLLMProvider
from app.services.ai.circuit_breaker import (
    get_circuit_breaker,
    is_daily_quota_error,
    is_model_unavailable_or_not_found,
)

logger = logging.getLogger(__name__)


def _clean_json_text(text: str) -> str:
    """Strip markdown code fence blocks if returned by model."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _is_transient_error(err: Exception) -> bool:
    """Check if exception is transient (temporary 503, high demand spike)."""
    err_str = str(err).lower()
    transient_indicators = [
        "503",
        "unavailable",
        "high demand",
        "deadline",
        "timed out",
        "timeout",
    ]
    return any(ind in err_str for ind in transient_indicators)


class GeminiProvider(BaseLLMProvider):
    """Provider for Google GenAI models with cascading ladder and sticky quota circuit breaker."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        fallback_model: Optional[str] = None,
        model_cascade: Optional[List[str]] = None,
    ):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        self.primary_model = model or settings.gemini_model
        self.fallback_model = fallback_model or settings.gemini_fallback_model
        self.timeout_seconds = settings.ai_request_timeout_seconds
        self.circuit_breaker = get_circuit_breaker()

        # Build ordered model cascade list
        if model_cascade:
            self.model_cascade = list(model_cascade)
        else:
            self.model_cascade = list(settings.gemini_models_list)

        # Metadata tracking for latest execution
        self.last_model_used: Optional[str] = None
        self.last_fallback_occurred: bool = False
        self.last_fallback_reason: Optional[str] = None

        self._client: Optional[genai.Client] = None
        if self.api_key:
            http_options = types.HttpOptions(timeout=int(self.timeout_seconds * 1000))
            self._client = genai.Client(api_key=self.api_key, http_options=http_options)

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def is_available(self) -> bool:
        """Check if Gemini API key is configured and at least one model in cascade is not tripped."""
        if not (self.api_key and self.api_key.strip()):
            return False
        # If all models in the cascade are tripped by daily quota, provider is temporarily exhausted
        all_tripped = all(self.circuit_breaker.is_tripped(m) for m in self.model_cascade)
        return not all_tripped

    async def _execute_with_cascade(self, execute_fn: Callable[[str], Any]) -> Any:
        """Execute call across the model cascade ladder, checking circuit breakers."""
        last_error: Optional[Exception] = None
        reasons: List[str] = []
        delays = [1.0, 2.0]

        for idx, model_name in enumerate(self.model_cascade):
            # 1. Sticky Circuit Breaker Check (0s latency penalty)
            if self.circuit_breaker.is_tripped(model_name):
                info = self.circuit_breaker.get_trip_info(model_name)
                reason = info.get("reason", "Quota exhausted") if info else "Quota exhausted"
                logger.info(
                    "Circuit breaker ACTIVE for '%s' (%s). Advancing ladder with 0s latency penalty.",
                    model_name,
                    reason,
                )
                reasons.append(f"{model_name} bypassed ({reason})")
                continue

            # 2. Try model with up to 2 transient retries
            retries = 2
            model_succeeded = False

            for attempt in range(retries):
                try:
                    result = await execute_fn(model_name)
                    model_succeeded = True
                    self.last_model_used = model_name
                    if idx > 0 or reasons:
                        self.last_fallback_occurred = True
                        self.last_fallback_reason = "; ".join(reasons)
                    else:
                        self.last_fallback_occurred = False
                        self.last_fallback_reason = None
                    return result
                except Exception as e:
                    last_error = e

                    # Check for 404 NOT_FOUND / Deprecated model -> Trip Circuit Breaker permanently!
                    if is_model_unavailable_or_not_found(e):
                        trip_msg = f"Model unavailable or deprecated (404 NOT_FOUND): {e}"
                        self.circuit_breaker.trip(model_name, reason=trip_msg, is_daily_quota=False)
                        reasons.append(f"{model_name} unavailable/deprecated")
                        logger.warning(
                            "Model '%s' returned 404 NOT_FOUND. Tripping circuit breaker permanently. Advancing cascade immediately.",
                            model_name,
                        )
                        break  # Do NOT retry this model; jump immediately to next in cascade

                    # Check for 429 Daily Quota Exhaustion -> Trip Circuit Breaker immediately!
                    if is_daily_quota_error(e):
                        trip_msg = f"Daily quota exhausted (429/RESOURCE_EXHAUSTED): {e}"
                        self.circuit_breaker.trip(model_name, reason=trip_msg, is_daily_quota=True)
                        reasons.append(f"{model_name} daily quota exhausted")
                        logger.warning(
                            "Model '%s' hit daily quota limit. Tripping circuit breaker. Advancing cascade immediately.",
                            model_name,
                        )
                        break  # Do NOT retry this model; jump immediately to next in cascade

                    # Check for transient error (temporary 503 high demand spike) -> exponential backoff
                    if _is_transient_error(e) and attempt < retries - 1:
                        delay = delays[min(attempt, len(delays) - 1)]
                        logger.warning(
                            "Gemini call on '%s' encountered transient error: %s. Retrying in %.1fs (attempt %d/%d)...",
                            model_name,
                            e,
                            delay,
                            attempt + 1,
                            retries,
                        )
                        await asyncio.sleep(delay)
                    else:
                        reasons.append(f"{model_name} failed: {e}")
                        logger.warning("Gemini model '%s' failed: %s. Cascading to next tier...", model_name, e)
                        break

        # If all models in cascade were exhausted or failed
        total_reason = "; ".join(reasons) if reasons else str(last_error)
        logger.error("All Gemini cascade tiers failed: %s", total_reason)
        if last_error:
            raise last_error
        raise RuntimeError(f"All Gemini cascade models failed or circuit-broken: {total_reason}")

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> str:
        """Generate text output using Gemini with cascading ladder and circuit breaker."""
        if not self._client:
            raise RuntimeError("Gemini API key is not configured.")

        config = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=system_prompt,
            **kwargs,
        )

        async def _call(model_name: str) -> str:
            response = await self._client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
            return response.text or ""

        try:
            return await self._execute_with_cascade(_call)
        except Exception as e:
            logger.error("Gemini text generation failed: %s", e)
            raise

    async def generate_structured(
        self,
        prompt: str,
        schema: Optional[Type[BaseModel]] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Generate structured JSON output using Gemini schema enforcement with cascade."""
        if not self._client:
            raise RuntimeError("Gemini API key is not configured.")

        config_args: Dict[str, Any] = {
            "temperature": temperature,
            "system_instruction": system_prompt,
            "response_mime_type": "application/json",
        }
        if schema:
            config_args["response_schema"] = schema

        config = types.GenerateContentConfig(**config_args, **kwargs)

        async def _call(model_name: str) -> Dict[str, Any]:
            response = await self._client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
            raw_text = response.text or "{}"
            cleaned = _clean_json_text(raw_text)
            return json.loads(cleaned)

        try:
            return await self._execute_with_cascade(_call)
        except Exception as e:
            logger.error("Gemini structured generation failed: %s", e)
            raise
