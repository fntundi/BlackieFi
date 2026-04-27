from __future__ import annotations

import asyncio

from fastmcp import FastMCP

from .service import extract_transactions_from_pdf, market_news, market_prices


mcp = FastMCP("blackiefi-llm")


@mcp.tool(name="market-prices")
def market_prices_tool(symbols: list[str]) -> list[dict]:
    return asyncio.run(market_prices(symbols))


@mcp.tool(name="market-news")
def market_news_tool(symbols: list[str], risk_tolerance: str = "moderate") -> dict:
    return asyncio.run(market_news(symbols, risk_tolerance))


@mcp.tool(name="extract-transactions-from-pdf")
def extract_transactions_from_pdf_tool(file_path: str) -> list[dict]:
    return asyncio.run(extract_transactions_from_pdf(file_path))


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8002)
