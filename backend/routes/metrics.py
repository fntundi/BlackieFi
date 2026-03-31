"""
Metrics & Observability Routes - Prometheus metrics endpoint
Part of BlackieFi 3.0 Phase 4: Institutional Hardening
"""
import os

from fastapi import APIRouter, Response, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse

from routes.auth import get_current_user
from services.metrics_service import get_metrics_service

router = APIRouter(tags=["Observability"])


@router.get("/api/metrics", response_class=PlainTextResponse)
async def prometheus_metrics(request: Request):
    """
    Prometheus metrics endpoint.
    Returns metrics in Prometheus text format.
    
    This endpoint is typically accessed by Prometheus scraper
    and should be protected in production (via network policy or auth).
    """
    token = os.environ.get("METRICS_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="Metrics token not configured")

    auth_header = request.headers.get("Authorization", "")
    if auth_header != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    metrics = get_metrics_service()
    return Response(
        content=metrics.get_metrics(),
        media_type=metrics.get_content_type(),
    )


@router.get("/api/admin/metrics/summary")
async def get_metrics_summary(
    current_user: dict = Depends(get_current_user),
):
    """
    Get a human-readable summary of key metrics.
    Admin only.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # This would typically aggregate from Prometheus or internal counters
    # For now, return a placeholder structure
    return {
        "service": "blackiefi-api",
        "status": "healthy",
        "metrics_endpoint": "/metrics",
        "note": "Use Prometheus/Grafana for full metrics visualization",
    }
