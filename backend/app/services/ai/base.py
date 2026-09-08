"""Base abstract interface for LLM providers."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Type
from pydantic import BaseModel


class BaseLLMProvider(ABC):
    """Abstract interface for LLM providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Identifier for the LLM provider."""
        pass

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> str:
        """Generate plain text / markdown output."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        schema: Optional[Type[BaseModel]] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Generate structured JSON dictionary output adhering to a schema."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider is configured and available."""
        pass
