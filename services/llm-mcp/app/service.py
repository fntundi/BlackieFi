from __future__ import annotations

import json
import os
from typing import Any

import httpx
from pypdf import PdfReader


PROVIDER_TYPE = os.getenv("LLM_PROVIDER_TYPE", "disabled").lower()
MODEL_NAME = os.getenv("LLM_MODEL", "gpt-4.1-mini")
BASE_URL = os.getenv("LLM_BASE_URL", "").rstrip("/")
API_KEY = os.getenv("LLM_API_KEY", "")


class ProviderError(RuntimeError):
    pass


def provider_enabled() -> bool:
    return PROVIDER_TYPE != "disabled" and bool(BASE_URL)


async def _call_openai_compatible(prompt: str, *, system: str | None = None) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"{BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL_NAME,
                "temperature": 0.2,
                "messages": [
                    *([{"role": "system", "content": system}] if system else []),
                    {"role": "user", "content": prompt},
                ],
            },
        )
        response.raise_for_status()
        return response.json()


async def _call_ollama(prompt: str, *, system: str | None = None) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"{BASE_URL}/api/chat",
            json={
                "model": MODEL_NAME,
                "stream": False,
                "messages": [
                    *([{"role": "system", "content": system}] if system else []),
                    {"role": "user", "content": prompt},
                ],
            },
        )
        response.raise_for_status()
        return response.json()


async def _call_anthropic(prompt: str, *, system: str | None = None) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"{BASE_URL}/messages",
            headers={
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": MODEL_NAME,
                "max_tokens": 1800,
                "system": system or "",
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        return response.json()


async def chat_completion(prompt: str, *, system: str | None = None) -> str:
    if not provider_enabled():
        raise ProviderError("LLM provider is not configured.")

    if PROVIDER_TYPE in {"openai", "openai-compatible", "openrouter"}:
      data = await _call_openai_compatible(prompt, system=system)
      return data["choices"][0]["message"]["content"]
    if PROVIDER_TYPE == "ollama":
      data = await _call_ollama(prompt, system=system)
      return data["message"]["content"]
    if PROVIDER_TYPE in {"anthropic", "claude"}:
      data = await _call_anthropic(prompt, system=system)
      content = data.get("content", [])
      text_chunks = [chunk.get("text", "") for chunk in content if chunk.get("type") == "text"]
      return "".join(text_chunks)

    raise ProviderError(f"Unsupported provider type: {PROVIDER_TYPE}")


async def market_prices(symbols: list[str]) -> list[dict[str, Any]]:
    if not provider_enabled():
        return []

    prompt = (
        "Return a JSON array with the current market price snapshot for each symbol. "
        "Every item must include asset_name, current_price, change_24h_percent, and market_status. "
        f"Symbols: {', '.join(symbols)}"
    )
    response = await chat_completion(prompt, system="You are a precise financial data summarizer. Return JSON only.")
    return json.loads(response)


async def market_news(symbols: list[str], risk_tolerance: str = "moderate") -> dict[str, Any]:
    if not provider_enabled():
        return {
            "market_sentiment": {
                "overall": "neutral",
                "confidence": "medium",
                "key_drivers": ["rates", "inflation", "earnings"]
            },
            "news_items": [],
            "alerts": []
        }

    prompt = (
        "Return JSON with market sentiment, news_items, and alerts for the following holdings. "
        "Each news item must include title, source, impact_level, summary, impact_analysis, "
        "affected_assets, and recommended_action. "
        f"Symbols: {', '.join(symbols)}. Risk tolerance: {risk_tolerance}."
    )
    response = await chat_completion(prompt, system="You are a finance market analyst. Return JSON only.")
    return json.loads(response)


async def extract_transactions_from_pdf(file_path: str) -> list[dict[str, Any]]:
    reader = PdfReader(file_path)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if not provider_enabled():
        raise ProviderError("PDF extraction requires a configured LLM provider.")

    prompt = (
        "Extract bank statement transactions from the following text. "
        "Return a JSON array of objects with date, description, amount, and type "
        f"(income or expense).\n\n{text[:20000]}"
    )
    response = await chat_completion(prompt, system="You extract structured transaction data. Return JSON only.")
    return json.loads(response)


async def invoke_tool(name: str, payload: dict[str, Any]) -> Any:
    if name == "market-prices":
        return await market_prices(payload.get("symbols", []))
    if name == "market-news":
        return await market_news(payload.get("symbols", []), payload.get("risk_tolerance", "moderate"))
    if name == "extract-transactions-from-pdf":
        return await extract_transactions_from_pdf(payload["file_path"])

    raise KeyError(name)
