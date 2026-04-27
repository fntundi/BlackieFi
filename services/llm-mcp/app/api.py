from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .service import ProviderError, invoke_tool, provider_enabled


class InvokeRequest(BaseModel):
    payload: dict


app = FastAPI(title="BlackieFi LLM Service", version="0.1.0")


@app.get("/health")
async def health():
    return {
        "ok": True,
        "provider_enabled": provider_enabled()
    }


@app.post("/invoke/{tool_name}")
async def invoke(tool_name: str, request: InvokeRequest):
    try:
        result = await invoke_tool(tool_name, request.payload)
        return {"result": result}
    except ProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {tool_name}") from exc
