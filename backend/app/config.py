"""Configuration settings for the Fact Vault & Context Extender."""

from pathlib import Path
from typing import List, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment and .env files."""

    # Gemini settings
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    gemini_fallback_model: str = "gemini-3.6-flash"
    gemini_model_cascade: str = "gemini-3.8-flash,gemini-3.6-flash"

    # OpenAI-compatible / Local LLM settings
    openai_base_url: str = "http://localhost:8000/v1"
    openai_api_key: str = "EMPTY"
    openai_model: str = "qwen-3.8"

    # Provider routing & timeouts
    ai_primary_provider: str = "gemini"
    ai_fallback_provider: str = "openai_compatible"
    ai_request_timeout_seconds: float = 300.0
    ai_connect_timeout_seconds: float = 60.0

    # Fact & context budgeting for synthesis
    max_synthesis_facts: int = 50
    max_synthesis_char_budget: int = 35000

    # Vault storage
    vault_dir: str = "../vault"

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def gemini_models_list(self) -> List[str]:
        """Ordered list of Gemini models to try in the cascade."""
        models: List[str] = []
        for m in self.gemini_model_cascade.split(","):
            cleaned = m.strip()
            if cleaned and cleaned not in models:
                models.append(cleaned)
        # Ensure configured primary model is at the front
        if self.gemini_model and self.gemini_model in models:
            models.remove(self.gemini_model)
            models.insert(0, self.gemini_model)
        elif self.gemini_model:
            models.insert(0, self.gemini_model)
        return models

    @property
    def resolved_vault_dir(self) -> Path:
        """Resolve vault directory path relative to repo or backend."""
        v_path = Path(self.vault_dir)
        if v_path.is_absolute():
            v_path.mkdir(parents=True, exist_ok=True)
            return v_path

        # Try cwd
        cwd_rel = (Path.cwd() / v_path).resolve()
        if cwd_rel.exists():
            return cwd_rel

        # Try relative to backend dir (parent of app/)
        backend_rel = (Path(__file__).resolve().parent.parent / v_path).resolve()
        if backend_rel.exists():
            return backend_rel

        # Try root repo / vault
        root_vault = (Path(__file__).resolve().parent.parent.parent / "vault").resolve()
        if root_vault.exists():
            return root_vault

        # Default fallback: create at cwd_rel
        cwd_rel.mkdir(parents=True, exist_ok=True)
        return cwd_rel

    @property
    def sources_dir(self) -> Path:
        path = self.resolved_vault_dir / "sources"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def facts_dir(self) -> Path:
        path = self.resolved_vault_dir / "facts"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def guides_dir(self) -> Path:
        path = self.resolved_vault_dir / "guides"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def projects_dir(self) -> Path:
        path = self.resolved_vault_dir / "projects"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def curriculum_dir(self) -> Path:
        path = self.resolved_vault_dir / "curriculum"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def scripts_dir(self) -> Path:
        path = self.resolved_vault_dir / "scripts"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def presentations_dir(self) -> Path:
        path = self.resolved_vault_dir / "presentations"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def media_dir(self) -> Path:
        path = self.resolved_vault_dir / "media"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def media_uploads_dir(self) -> Path:
        path = self.media_dir / "uploads"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def media_processed_dir(self) -> Path:
        path = self.media_dir / "processed"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def media_jobs_dir(self) -> Path:
        path = self.media_dir / "jobs"
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()


def get_settings() -> Settings:
    return settings
