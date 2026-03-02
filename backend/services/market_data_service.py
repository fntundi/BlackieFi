"""
Market Data Service - Unified interface for stock and crypto market data
Supports Alpha Vantage (stocks) and CoinGecko (crypto)
Part of BlackieFi 3.0 Market Data Integration
"""
import os
import json
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
from motor.motor_asyncio import AsyncIOMotorDatabase


class MarketDataProvider(str, Enum):
    """Supported market data providers"""
    ALPHA_VANTAGE = "alpha_vantage"
    COINGECKO = "coingecko"


class MarketDataService:
    """
    Unified market data service supporting stocks and crypto.
    Implements caching and rate limit handling.
    """
    
    # Provider configurations
    PROVIDER_CONFIGS = {
        MarketDataProvider.ALPHA_VANTAGE: {
            "name": "Alpha Vantage",
            "description": "Real-time and historical stock market data. Covers US equities, forex, and commodities.",
            "base_url": "https://www.alphavantage.co/query",
            "requires_api_key": True,
            "env_key": "ALPHA_VANTAGE_API_KEY",
            "rate_limit": "5 requests/minute (free), 75 requests/minute (premium)",
            "signup_url": "https://www.alphavantage.co/support/#api-key",
            "asset_type": "stocks",
        },
        MarketDataProvider.COINGECKO: {
            "name": "CoinGecko",
            "description": "Comprehensive cryptocurrency market data. Covers 10,000+ coins with real-time prices.",
            "base_url": "https://api.coingecko.com/api/v3",
            "requires_api_key": False,  # Free tier doesn't require key
            "env_key": "COINGECKO_API_KEY",
            "rate_limit": "10-30 requests/minute depending on tier",
            "signup_url": "https://www.coingecko.com/en/api/pricing",
            "asset_type": "crypto",
        },
    }
    
    # Cache TTLs (seconds)
    CACHE_TTL = {
        "quote": 60,           # 1 minute for real-time quotes
        "historical": 3600,    # 1 hour for historical data
        "search": 86400,       # 24 hours for search results
        "fundamentals": 3600,  # 1 hour for fundamentals
        "trending": 600,       # 10 minutes for trending
    }
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._client = None
        
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client
    
    async def _get_provider_config(self, provider: MarketDataProvider) -> Optional[Dict]:
        """Get provider configuration from database"""
        config = await self.db.market_data_providers.find_one({"provider": provider.value})
        return config
    
    async def _is_provider_enabled(self, provider: MarketDataProvider) -> bool:
        """Check if provider is enabled"""
        config = await self._get_provider_config(provider)
        return config.get("enabled", False) if config else False
    
    async def _get_api_key(self, provider: MarketDataProvider) -> Optional[str]:
        """Get API key for provider"""
        config = await self._get_provider_config(provider)
        if config and config.get("api_key"):
            return config["api_key"]
        # Fall back to environment variable
        env_key = self.PROVIDER_CONFIGS[provider]["env_key"]
        return os.environ.get(env_key)
    
    async def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """Get data from cache"""
        cached = await self.db.market_data_cache.find_one({"_id": cache_key})
        if cached and cached.get("expires_at"):
            expires = datetime.fromisoformat(cached["expires_at"].replace("Z", "+00:00"))
            if expires > datetime.now(timezone.utc):
                return cached.get("data")
        return None
    
    async def _set_cache(self, cache_key: str, data: Dict, ttl_type: str):
        """Store data in cache"""
        ttl = self.CACHE_TTL.get(ttl_type, 300)
        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=ttl)).isoformat()
        
        await self.db.market_data_cache.update_one(
            {"_id": cache_key},
            {"$set": {
                "data": data,
                "expires_at": expires_at,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True
        )
    
    # =========================================================================
    # ALPHA VANTAGE - Stock Market Data
    # =========================================================================
    
    async def get_stock_quote(self, symbol: str) -> Dict[str, Any]:
        """Get real-time stock quote from Alpha Vantage"""
        if not await self._is_provider_enabled(MarketDataProvider.ALPHA_VANTAGE):
            return {"error": "Alpha Vantage is not enabled", "enabled": False}
        
        api_key = await self._get_api_key(MarketDataProvider.ALPHA_VANTAGE)
        if not api_key:
            return {"error": "Alpha Vantage API key not configured"}
        
        cache_key = f"av_quote_{symbol.upper()}"
        cached = await self._get_from_cache(cache_key)
        if cached:
            cached["cached"] = True
            return cached
        
        try:
            client = await self._get_client()
            response = await client.get(
                self.PROVIDER_CONFIGS[MarketDataProvider.ALPHA_VANTAGE]["base_url"],
                params={
                    "function": "GLOBAL_QUOTE",
                    "symbol": symbol.upper(),
                    "apikey": api_key,
                }
            )
            data = response.json()
            
            if "Global Quote" not in data:
                error_msg = data.get("Note", data.get("Error Message", "Unknown error"))
                return {"error": error_msg, "symbol": symbol}
            
            quote = data["Global Quote"]
            result = {
                "symbol": quote.get("01. symbol"),
                "price": float(quote.get("05. price", 0)),
                "change": float(quote.get("09. change", 0)),
                "change_percent": quote.get("10. change percent", "0%").replace("%", ""),
                "volume": int(quote.get("06. volume", 0)),
                "latest_trading_day": quote.get("07. latest trading day"),
                "previous_close": float(quote.get("08. previous close", 0)),
                "open": float(quote.get("02. open", 0)),
                "high": float(quote.get("03. high", 0)),
                "low": float(quote.get("04. low", 0)),
                "provider": "alpha_vantage",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cached": False,
            }
            
            await self._set_cache(cache_key, result, "quote")
            return result
            
        except Exception as e:
            return {"error": str(e), "symbol": symbol}
    
    async def get_stock_historical(
        self, 
        symbol: str, 
        outputsize: str = "compact"
    ) -> Dict[str, Any]:
        """Get historical stock data from Alpha Vantage"""
        if not await self._is_provider_enabled(MarketDataProvider.ALPHA_VANTAGE):
            return {"error": "Alpha Vantage is not enabled", "enabled": False}
        
        api_key = await self._get_api_key(MarketDataProvider.ALPHA_VANTAGE)
        if not api_key:
            return {"error": "Alpha Vantage API key not configured"}
        
        cache_key = f"av_historical_{symbol.upper()}_{outputsize}"
        cached = await self._get_from_cache(cache_key)
        if cached:
            cached["cached"] = True
            return cached
        
        try:
            client = await self._get_client()
            response = await client.get(
                self.PROVIDER_CONFIGS[MarketDataProvider.ALPHA_VANTAGE]["base_url"],
                params={
                    "function": "TIME_SERIES_DAILY",
                    "symbol": symbol.upper(),
                    "outputsize": outputsize,
                    "apikey": api_key,
                }
            )
            data = response.json()
            
            if "Time Series (Daily)" not in data:
                error_msg = data.get("Note", data.get("Error Message", "Unknown error"))
                return {"error": error_msg, "symbol": symbol}
            
            time_series = data["Time Series (Daily)"]
            prices = []
            for date, values in list(time_series.items())[:100]:  # Last 100 days
                prices.append({
                    "date": date,
                    "open": float(values["1. open"]),
                    "high": float(values["2. high"]),
                    "low": float(values["3. low"]),
                    "close": float(values["4. close"]),
                    "volume": int(values["5. volume"]),
                })
            
            result = {
                "symbol": symbol.upper(),
                "prices": prices,
                "provider": "alpha_vantage",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cached": False,
            }
            
            await self._set_cache(cache_key, result, "historical")
            return result
            
        except Exception as e:
            return {"error": str(e), "symbol": symbol}
    
    async def search_stocks(self, keywords: str) -> Dict[str, Any]:
        """Search for stocks by name or symbol"""
        if not await self._is_provider_enabled(MarketDataProvider.ALPHA_VANTAGE):
            return {"error": "Alpha Vantage is not enabled", "enabled": False}
        
        api_key = await self._get_api_key(MarketDataProvider.ALPHA_VANTAGE)
        if not api_key:
            return {"error": "Alpha Vantage API key not configured"}
        
        cache_key = f"av_search_{keywords.lower().replace(' ', '_')}"
        cached = await self._get_from_cache(cache_key)
        if cached:
            cached["cached"] = True
            return cached
        
        try:
            client = await self._get_client()
            response = await client.get(
                self.PROVIDER_CONFIGS[MarketDataProvider.ALPHA_VANTAGE]["base_url"],
                params={
                    "function": "SYMBOL_SEARCH",
                    "keywords": keywords,
                    "apikey": api_key,
                }
            )
            data = response.json()
            
            matches = data.get("bestMatches", [])
            results = []
            for match in matches[:10]:
                results.append({
                    "symbol": match.get("1. symbol"),
                    "name": match.get("2. name"),
                    "type": match.get("3. type"),
                    "region": match.get("4. region"),
                    "currency": match.get("8. currency"),
                })
            
            result = {
                "query": keywords,
                "results": results,
                "provider": "alpha_vantage",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cached": False,
            }
            
            await self._set_cache(cache_key, result, "search")
            return result
            
        except Exception as e:
            return {"error": str(e), "query": keywords}
    
    # =========================================================================
    # COINGECKO - Cryptocurrency Market Data
    # =========================================================================
    
    async def get_crypto_price(self, coin_id: str) -> Dict[str, Any]:
        """Get real-time crypto price from CoinGecko"""
        if not await self._is_provider_enabled(MarketDataProvider.COINGECKO):
            return {"error": "CoinGecko is not enabled", "enabled": False}
        
        cache_key = f"cg_price_{coin_id.lower()}"
        cached = await self._get_from_cache(cache_key)
        if cached:
            cached["cached"] = True
            return cached
        
        try:
            client = await self._get_client()
            base_url = self.PROVIDER_CONFIGS[MarketDataProvider.COINGECKO]["base_url"]
            
            # Add API key header if available
            headers = {}
            api_key = await self._get_api_key(MarketDataProvider.COINGECKO)
            if api_key:
                headers["x-cg-demo-api-key"] = api_key
            
            response = await client.get(
                f"{base_url}/simple/price",
                params={
                    "ids": coin_id.lower(),
                    "vs_currencies": "usd",
                    "include_24hr_change": "true",
                    "include_market_cap": "true",
                    "include_24hr_vol": "true",
                },
                headers=headers,
            )
            data = response.json()
            
            if coin_id.lower() not in data:
                return {"error": f"Cryptocurrency '{coin_id}' not found"}
            
            coin_data = data[coin_id.lower()]
            result = {
                "coin_id": coin_id.lower(),
                "price": coin_data.get("usd", 0),
                "change_24h": coin_data.get("usd_24h_change", 0),
                "market_cap": coin_data.get("usd_market_cap", 0),
                "volume_24h": coin_data.get("usd_24h_vol", 0),
                "provider": "coingecko",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cached": False,
            }
            
            await self._set_cache(cache_key, result, "quote")
            return result
            
        except Exception as e:
            return {"error": str(e), "coin_id": coin_id}
    
    async def get_crypto_historical(
        self, 
        coin_id: str, 
        days: int = 30
    ) -> Dict[str, Any]:
        """Get historical crypto data from CoinGecko"""
        if not await self._is_provider_enabled(MarketDataProvider.COINGECKO):
            return {"error": "CoinGecko is not enabled", "enabled": False}
        
        cache_key = f"cg_historical_{coin_id.lower()}_{days}"
        cached = await self._get_from_cache(cache_key)
        if cached:
            cached["cached"] = True
            return cached
        
        try:
            client = await self._get_client()
            base_url = self.PROVIDER_CONFIGS[MarketDataProvider.COINGECKO]["base_url"]
            
            headers = {}
            api_key = await self._get_api_key(MarketDataProvider.COINGECKO)
            if api_key:
                headers["x-cg-demo-api-key"] = api_key
            
            response = await client.get(
                f"{base_url}/coins/{coin_id.lower()}/market_chart",
                params={
                    "vs_currency": "usd",
                    "days": days,
                },
                headers=headers,
            )
            data = response.json()
            
            if "error" in data:
                return {"error": data["error"]}
            
            # Format prices as list of {date, price}
            prices = []
            for timestamp, price in data.get("prices", []):
                prices.append({
                    "date": datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc).isoformat(),
                    "price": price,
                })
            
            result = {
                "coin_id": coin_id.lower(),
                "days": days,
                "prices": prices,
                "market_caps": data.get("market_caps", []),
                "volumes": data.get("total_volumes", []),
                "provider": "coingecko",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cached": False,
            }
            
            await self._set_cache(cache_key, result, "historical")
            return result
            
        except Exception as e:
            return {"error": str(e), "coin_id": coin_id}
    
    async def get_top_cryptos(self, limit: int = 10) -> Dict[str, Any]:
        """Get top cryptocurrencies by market cap"""
        if not await self._is_provider_enabled(MarketDataProvider.COINGECKO):
            return {"error": "CoinGecko is not enabled", "enabled": False}
        
        cache_key = f"cg_top_{limit}"
        cached = await self._get_from_cache(cache_key)
        if cached:
            cached["cached"] = True
            return cached
        
        try:
            client = await self._get_client()
            base_url = self.PROVIDER_CONFIGS[MarketDataProvider.COINGECKO]["base_url"]
            
            headers = {}
            api_key = await self._get_api_key(MarketDataProvider.COINGECKO)
            if api_key:
                headers["x-cg-demo-api-key"] = api_key
            
            response = await client.get(
                f"{base_url}/coins/markets",
                params={
                    "vs_currency": "usd",
                    "order": "market_cap_desc",
                    "per_page": limit,
                    "page": 1,
                    "sparkline": "false",
                    "price_change_percentage": "24h",
                },
                headers=headers,
            )
            data = response.json()
            
            # Handle error response from CoinGecko
            if isinstance(data, dict) and ("error" in data or "status" in data):
                error_msg = data.get("error") or data.get("status", {}).get("error_message", "Unknown error")
                return {"error": error_msg}
            
            # Handle unexpected response type
            if not isinstance(data, list):
                return {"error": f"Unexpected response format: {type(data).__name__}"}
            
            coins = []
            for coin in data:
                coins.append({
                    "id": coin.get("id"),
                    "symbol": coin.get("symbol"),
                    "name": coin.get("name"),
                    "price": coin.get("current_price"),
                    "market_cap": coin.get("market_cap"),
                    "market_cap_rank": coin.get("market_cap_rank"),
                    "change_24h": coin.get("price_change_percentage_24h"),
                    "volume_24h": coin.get("total_volume"),
                    "image": coin.get("image"),
                })
            
            result = {
                "coins": coins,
                "provider": "coingecko",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cached": False,
            }
            
            await self._set_cache(cache_key, result, "quote")
            return result
            
        except Exception as e:
            return {"error": str(e)}
    
    async def search_cryptos(self, query: str) -> Dict[str, Any]:
        """Search for cryptocurrencies"""
        if not await self._is_provider_enabled(MarketDataProvider.COINGECKO):
            return {"error": "CoinGecko is not enabled", "enabled": False}
        
        cache_key = f"cg_search_{query.lower().replace(' ', '_')}"
        cached = await self._get_from_cache(cache_key)
        if cached:
            cached["cached"] = True
            return cached
        
        try:
            client = await self._get_client()
            base_url = self.PROVIDER_CONFIGS[MarketDataProvider.COINGECKO]["base_url"]
            
            headers = {}
            api_key = await self._get_api_key(MarketDataProvider.COINGECKO)
            if api_key:
                headers["x-cg-demo-api-key"] = api_key
            
            response = await client.get(
                f"{base_url}/search",
                params={"query": query},
                headers=headers,
            )
            data = response.json()
            
            coins = []
            for coin in data.get("coins", [])[:10]:
                coins.append({
                    "id": coin.get("id"),
                    "symbol": coin.get("symbol"),
                    "name": coin.get("name"),
                    "market_cap_rank": coin.get("market_cap_rank"),
                    "thumb": coin.get("thumb"),
                })
            
            result = {
                "query": query,
                "results": coins,
                "provider": "coingecko",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cached": False,
            }
            
            await self._set_cache(cache_key, result, "search")
            return result
            
        except Exception as e:
            return {"error": str(e), "query": query}
    
    async def get_trending_cryptos(self) -> Dict[str, Any]:
        """Get trending cryptocurrencies"""
        if not await self._is_provider_enabled(MarketDataProvider.COINGECKO):
            return {"error": "CoinGecko is not enabled", "enabled": False}
        
        cache_key = "cg_trending"
        cached = await self._get_from_cache(cache_key)
        if cached:
            cached["cached"] = True
            return cached
        
        try:
            client = await self._get_client()
            base_url = self.PROVIDER_CONFIGS[MarketDataProvider.COINGECKO]["base_url"]
            
            headers = {}
            api_key = await self._get_api_key(MarketDataProvider.COINGECKO)
            if api_key:
                headers["x-cg-demo-api-key"] = api_key
            
            response = await client.get(
                f"{base_url}/search/trending",
                headers=headers,
            )
            data = response.json()
            
            coins = []
            for item in data.get("coins", []):
                coin = item.get("item", {})
                coins.append({
                    "id": coin.get("id"),
                    "symbol": coin.get("symbol"),
                    "name": coin.get("name"),
                    "market_cap_rank": coin.get("market_cap_rank"),
                    "thumb": coin.get("thumb"),
                    "score": coin.get("score"),
                })
            
            result = {
                "trending": coins,
                "provider": "coingecko",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cached": False,
            }
            
            await self._set_cache(cache_key, result, "trending")
            return result
            
        except Exception as e:
            return {"error": str(e)}
    
    # =========================================================================
    # Provider Management
    # =========================================================================
    
    @classmethod
    def get_available_providers(cls) -> List[Dict[str, Any]]:
        """Get list of available market data providers"""
        providers = []
        for provider in MarketDataProvider:
            config = cls.PROVIDER_CONFIGS[provider]
            providers.append({
                "id": provider.value,
                "name": config["name"],
                "description": config["description"],
                "requires_api_key": config["requires_api_key"],
                "signup_url": config["signup_url"],
                "rate_limit": config["rate_limit"],
                "asset_type": config["asset_type"],
            })
        return providers
    
    async def test_provider(self, provider: MarketDataProvider) -> Dict[str, Any]:
        """Test if a provider is configured and working"""
        try:
            if provider == MarketDataProvider.ALPHA_VANTAGE:
                result = await self.get_stock_quote("AAPL")
            elif provider == MarketDataProvider.COINGECKO:
                result = await self.get_crypto_price("bitcoin")
            else:
                return {"success": False, "error": "Unknown provider"}
            
            if "error" in result:
                return {"success": False, "error": result["error"], "provider": provider.value}
            
            return {
                "success": True,
                "provider": provider.value,
                "sample_data": result,
                "message": f"{provider.value} is working correctly",
            }
            
        except Exception as e:
            return {"success": False, "error": str(e), "provider": provider.value}


# Singleton instance
_market_service: Optional[MarketDataService] = None


def get_market_data_service(db: AsyncIOMotorDatabase) -> MarketDataService:
    """Get or create market data service instance"""
    global _market_service
    if _market_service is None:
        _market_service = MarketDataService(db)
    else:
        # Update db reference in case it changed
        _market_service.db = db
    return _market_service
