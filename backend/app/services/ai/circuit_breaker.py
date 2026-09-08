"""Sticky Circuit Breaker for LLM provider models.

Remembers models that have exhausted quotas (such as free-tier 20 RPD caps)
so that future calls bypass them immediately with 0s latency.
"""

from datetime import datetime, timezone
import logging
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


def is_daily_quota_error(exc: Exception) -> bool:
    """Detect if an exception is due to daily quota exhaustion (429 RESOURCE_EXHAUSTED)."""
    msg = str(exc).lower()
    quota_indicators = [
        "resource_exhausted",
        "quota exceeded",
        "generate_content_free_tier_requests",
        "generaterequestsperday",
        "daily limit",
        "rpd",
        "per day",
    ]
    return any(ind in msg for ind in quota_indicators)


def is_model_unavailable_or_not_found(exc: Exception) -> bool:
    """Detect if an exception indicates the model does not exist or is deprecated (404 NOT_FOUND)."""
    msg = str(exc).lower()
    not_found_indicators = [
        "404",
        "not_found",
        "no longer available",
        "not found for api version",
        "is not supported for generatecontent",
        "invalid model name",
    ]
    return any(ind in msg for ind in not_found_indicators)


class CircuitBreaker:
    """Manages circuit breaker states for AI models and endpoints."""

    def __init__(self):
        # identifier -> {"reason": str, "tripped_at": float, "is_daily_quota": bool}
        self._states: Dict[str, Dict[str, Any]] = {}

    def is_tripped(self, identifier: str) -> bool:
        """Check if an identifier (e.g. model name) has its circuit open."""
        return identifier in self._states

    def get_trip_info(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Get details about why an identifier is tripped."""
        return self._states.get(identifier)

    def trip(self, identifier: str, reason: str, is_daily_quota: bool = True) -> None:
        """Open the circuit breaker for an identifier."""
        now = time.time()
        self._states[identifier] = {
            "reason": reason,
            "tripped_at": now,
            "tripped_at_iso": datetime.fromtimestamp(now, timezone.utc).isoformat(),
            "is_daily_quota": is_daily_quota,
        }
        logger.warning(
            "CIRCUIT BREAKER TRIPPED for '%s'. Reason: %s (Daily quota: %s). Model will be bypassed with 0s penalty.",
            identifier,
            reason,
            is_daily_quota,
        )

    def reset(self, identifier: Optional[str] = None) -> None:
        """Reset the circuit breaker for a specific identifier or all."""
        if identifier:
            self._states.pop(identifier, None)
            logger.info("Circuit breaker reset for '%s'.", identifier)
        else:
            self._states.clear()
            logger.info("Circuit breaker reset for all models.")

    def get_status(self) -> Dict[str, Any]:
        """Return a dictionary of all currently tripped models."""
        return {k: dict(v) for k, v in self._states.items()}


# Global singleton instance
circuit_breaker = CircuitBreaker()


def get_circuit_breaker() -> CircuitBreaker:
    return circuit_breaker
