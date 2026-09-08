"""OpenAI-compatible LLM Provider implementation (Qwen 3.8 / vLLM / Ollama / Local endpoints)."""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Type
import httpx
from openai import AsyncOpenAI
from pydantic import BaseModel
from app.config import get_settings
from app.services.ai.base import BaseLLMProvider

logger = logging.getLogger(__name__)


def _clean_json_text(text: str) -> str:
    """Strip markdown code fence blocks, thinking tags, and embedded text if returned by model."""
    text = text.strip()
    # Remove reasoning model <think>...</think> blocks (e.g. Qwen, DeepSeek)
    text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    # Extract JSON inside markdown code fences
    fence_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if fence_match:
        return fence_match.group(1).strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    # Extract outermost JSON object if model included conversational preamble
    brace_match = re.search(r"(\{[\s\S]*\})", text)
    if brace_match:
        return brace_match.group(1).strip()
    return text.strip()


class OpenAICompatibleProvider(BaseLLMProvider):
    """Provider for local/remote OpenAI-compatible endpoints."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.openai_base_url).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.openai_api_key
        self.model = model or settings.openai_model
        self.request_timeout = settings.ai_request_timeout_seconds
        self.connect_timeout = settings.ai_connect_timeout_seconds
        client_timeout = httpx.Timeout(
            timeout=self.request_timeout,
            connect=self.connect_timeout,
        )
        self._client = AsyncOpenAI(
            base_url=self.base_url,
            api_key=self.api_key or "EMPTY",
            timeout=client_timeout,
        )

    @property
    def provider_name(self) -> str:
        return "openai_compatible"

    async def is_available(self) -> bool:
        """Check if local or remote OpenAI endpoint is reachable."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                # Try standard /models endpoint
                url = f"{self.base_url}/models"
                resp = await client.get(url, headers={"Authorization": f"Bearer {self.api_key}"})
                return resp.status_code == 200
        except Exception:
            return False

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> str:
        """Generate text using OpenAI-compatible API."""
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                **kwargs,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error("OpenAI-compatible text generation failed: %s", e)
            raise

    async def generate_structured(
        self,
        prompt: str,
        schema: Optional[Type[BaseModel]] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Generate structured JSON output with schema guidance."""
        messages: List[Dict[str, str]] = []

        sys_parts = []
        if system_prompt:
            sys_parts.append(system_prompt)

        sys_parts.append(
            "You MUST respond ONLY with valid JSON. Do not include markdown fences, thoughts, or explanations."
        )
        if schema:
            sys_parts.append(f"Required JSON Schema:\n{json.dumps(schema.model_json_schema())}")

        messages.append({"role": "system", "content": "\n\n".join(sys_parts)})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=temperature,
                **kwargs,
            )
            content = response.choices[0].message.content or ""
            if not content.strip():
                raise ValueError("Model returned an empty content string.")
            cleaned = _clean_json_text(content)
            parsed = json.loads(cleaned)
            if not parsed or not isinstance(parsed, dict):
                raise ValueError(f"Model returned empty or non-dict JSON structure: {content[:200]}")
            return parsed
        except Exception as e:
            logger.error("OpenAI-compatible structured generation failed: %s", e)
            raise
