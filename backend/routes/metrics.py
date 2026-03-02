"""
Metrics & Observability Routes - Prometheus metrics endpoint
Part of BlackieFi 3.0 Phase 4: Institutional Hardening
"""
from fastapi import APIRouter, Response, Depends
from fastapi.responses import PlainTextResponse

from routes.auth import get_current_user
from services.metrics_service import get_metrics_service

router = APIRouter(tags=["Observability"])


@router.get("/metrics", response_class=PlainTextResponse)
async def prometheus_metrics():
    """
    Prometheus metrics endpoint.
    Returns metrics in Prometheus text format.
    
    This endpoint is typically accessed by Prometheus scraper
    and should be protected in production (via network policy or auth).
    """
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
        return {"error": "Admin access required"}
    
    # This would typically aggregate from Prometheus or internal counters
    # For now, return a placeholder structure
    return {
        "service": "blackiefi-api",
        "status": "healthy",
        "metrics_endpoint": "/metrics",
        "note": "Use Prometheus/Grafana for full metrics visualization",
    }
