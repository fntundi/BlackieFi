"""
Knowledge Lab - Document Upload and RAG Integration
Supports documents, images, and videos for AI analysis
"""
import os
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, List
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel

from .auth import get_current_user

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Lab"])

# Configuration
UPLOAD_DIR = Path("/app/uploads/knowledge")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

ALLOWED_EXTENSIONS = {
    # Documents
    'pdf': 'document',
    'txt': 'document',
    'csv': 'document',
    'docx': 'document',
    'xlsx': 'document',
    'md': 'document',
    # Images
    'png': 'image',
    'jpg': 'image',
    'jpeg': 'image',
    'webp': 'image',
    'gif': 'image',
    'heic': 'image',
    # Videos
    'mp4': 'video',
    'mov': 'video',
    'webm': 'video',
    'avi': 'video',
    'mkv': 'video',
}


class KnowledgeDocument(BaseModel):
    id: str
    user_id: str
    entity_id: Optional[str] = None
    filename: str
    original_filename: str
    file_type: str  # document, image, video
    mime_type: str
    file_size: int
    file_hash: str
    description: Optional[str] = None
    tags: List[str] = []
    status: str = "pending"  # pending, processing, ready, error
    processing_error: Optional[str] = None
    embedding_count: int = 0
    created_at: str
    updated_at: str


class KnowledgeDocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_type: str
    mime_type: str
    file_size: int
    description: Optional[str] = None
    tags: List[str] = []
    status: str
    embedding_count: int
    created_at: str


def get_file_extension(filename: str) -> str:
    """Get lowercase file extension"""
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def get_mime_type(extension: str) -> str:
    """Get MIME type from extension"""
    mime_types = {
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'md': 'text/markdown',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'heic': 'image/heic',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'webm': 'video/webm',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
    }
    return mime_types.get(extension, 'application/octet-stream')


def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA-256 hash of file content"""
    return hashlib.sha256(content).hexdigest()


def get_user_id(current_user: dict) -> str:
    """Get user ID from current_user dict (handles both 'id' and '_id')"""
    return current_user.get("id") or current_user.get("_id")


async def get_db():
    """Get database instance"""
    from database import get_db as db_getter
    return db_getter()


@router.post("/upload", response_model=KnowledgeDocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated tags
    entity_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Upload a document, image, or video to the Knowledge Lab.
    
    Supported formats:
    - Documents: PDF, TXT, CSV, DOCX, XLSX, MD
    - Images: PNG, JPG, JPEG, WEBP, GIF, HEIC
    - Videos: MP4, MOV, WEBM, AVI, MKV
    
    Max file size: 50MB
    """
    # Validate file extension
    extension = get_file_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS.keys())}"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate unique filename
    file_hash = calculate_file_hash(content)
    unique_id = str(uuid.uuid4())
    safe_filename = f"{unique_id}.{extension}"
    
    # Check for duplicate
    existing = await db.knowledge_documents.find_one({
        "user_id": get_user_id(current_user),
        "file_hash": file_hash
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This file has already been uploaded"
        )
    
    # Save file
    file_path = UPLOAD_DIR / safe_filename
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Parse tags
    tag_list = []
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(',') if t.strip()]
    
    # Create document record
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "_id": unique_id,
        "user_id": get_user_id(current_user),
        "entity_id": entity_id,
        "filename": safe_filename,
        "original_filename": file.filename,
        "file_type": ALLOWED_EXTENSIONS[extension],
        "mime_type": get_mime_type(extension),
        "file_size": len(content),
        "file_hash": file_hash,
        "description": description,
        "tags": tag_list,
        "status": "pending",
        "processing_error": None,
        "embedding_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.knowledge_documents.insert_one(doc)
    
    # TODO: Trigger async processing for embeddings
    # For now, mark as ready for documents that don't need processing
    if ALLOWED_EXTENSIONS[extension] in ['image', 'video']:
        # Images and videos are ready immediately (analysis on-demand)
        await db.knowledge_documents.update_one(
            {"_id": unique_id},
            {"$set": {"status": "ready"}}
        )
        doc["status"] = "ready"
    else:
        # Documents need text extraction and embedding
        await db.knowledge_documents.update_one(
            {"_id": unique_id},
            {"$set": {"status": "ready"}}  # Simplified for now
        )
        doc["status"] = "ready"
    
    return {
        "id": doc["_id"],
        "filename": doc["filename"],
        "original_filename": doc["original_filename"],
        "file_type": doc["file_type"],
        "mime_type": doc["mime_type"],
        "file_size": doc["file_size"],
        "description": doc["description"],
        "tags": doc["tags"],
        "status": doc["status"],
        "embedding_count": doc["embedding_count"],
        "created_at": doc["created_at"],
    }


@router.get("/documents", response_model=List[KnowledgeDocumentResponse])
async def list_documents(
    entity_id: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """List all documents in the Knowledge Lab"""
    query = {"user_id": get_user_id(current_user)}
    
    if entity_id:
        query["entity_id"] = entity_id
    if file_type:
        query["file_type"] = file_type
    if tag:
        query["tags"] = tag.lower()
    
    docs = await db.knowledge_documents.find(query).sort("created_at", -1).to_list(100)
    
    return [
        {
            "id": doc["_id"],
            "filename": doc["filename"],
            "original_filename": doc["original_filename"],
            "file_type": doc["file_type"],
            "mime_type": doc["mime_type"],
            "file_size": doc["file_size"],
            "description": doc.get("description"),
            "tags": doc.get("tags", []),
            "status": doc["status"],
            "embedding_count": doc.get("embedding_count", 0),
            "created_at": doc["created_at"],
        }
        for doc in docs
    ]


@router.get("/documents/{doc_id}", response_model=KnowledgeDocumentResponse)
async def get_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get a specific document"""
    doc = await db.knowledge_documents.find_one({
        "_id": doc_id,
        "user_id": get_user_id(current_user)
    })
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": doc["_id"],
        "filename": doc["filename"],
        "original_filename": doc["original_filename"],
        "file_type": doc["file_type"],
        "mime_type": doc["mime_type"],
        "file_size": doc["file_size"],
        "description": doc.get("description"),
        "tags": doc.get("tags", []),
        "status": doc["status"],
        "embedding_count": doc.get("embedding_count", 0),
        "created_at": doc["created_at"],
    }


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Delete a document from the Knowledge Lab"""
    doc = await db.knowledge_documents.find_one({
        "_id": doc_id,
        "user_id": get_user_id(current_user)
    })
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file
    file_path = UPLOAD_DIR / doc["filename"]
    if file_path.exists():
        file_path.unlink()
    
    # Delete record
    await db.knowledge_documents.delete_one({"_id": doc_id})
    
    # TODO: Delete embeddings from ChromaDB
    
    return {"message": "Document deleted"}


@router.post("/analyze/{doc_id}")
async def analyze_document(
    doc_id: str,
    query: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Analyze a document using AI.
    
    For documents: Extract text and answer questions
    For images: Describe content and answer questions
    For videos: Extract frames and describe content
    """
    doc = await db.knowledge_documents.find_one({
        "_id": doc_id,
        "user_id": get_user_id(current_user)
    })
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc["status"] != "ready":
        raise HTTPException(status_code=400, detail="Document is not ready for analysis")
    
    # Get AI status
    settings = await db.settings.find_one({"type": "system"}) or {}
    if not settings.get("ai_enabled", False):
        raise HTTPException(status_code=400, detail="AI is not enabled")
    
    file_path = UPLOAD_DIR / doc["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Prepare analysis based on file type
    file_type = doc["file_type"]
    analysis_prompt = query or f"Analyze this {file_type} and provide key insights."
    
    try:
        from .ai_functions import get_llm_response
        
        # For now, provide a basic analysis response
        # In production, this would use vision models for images/videos
        if file_type == "document":
            # Read document content for text files
            if doc["mime_type"] in ["text/plain", "text/csv", "text/markdown"]:
                with open(file_path, 'r', errors='ignore') as f:
                    content = f.read()[:10000]  # Limit content
                
                system_prompt = """You are a financial document analyst. Analyze the provided document 
                and extract key financial insights, numbers, and recommendations."""
                
                response = await get_llm_response(
                    system_prompt=system_prompt,
                    user_message=f"Document content:\n{content}\n\nQuestion: {analysis_prompt}",
                    user_id=get_user_id(current_user),
                )
            else:
                response = {
                    "response": f"Document '{doc['original_filename']}' has been uploaded. "
                               f"For PDF and DOCX analysis, text extraction would be performed. "
                               f"Ask me specific questions about your financial documents."
                }
        
        elif file_type == "image":
            response = {
                "response": f"Image '{doc['original_filename']}' has been uploaded. "
                           f"For full image analysis, a vision model would analyze the content. "
                           f"This could identify charts, tables, receipts, or financial statements."
            }
        
        elif file_type == "video":
            response = {
                "response": f"Video '{doc['original_filename']}' has been uploaded. "
                           f"For full video analysis, key frames would be extracted and analyzed. "
                           f"This could identify presentations, financial reports, or meeting content."
            }
        else:
            response = {"response": "Unknown file type"}
        
        return {
            "document_id": doc_id,
            "filename": doc["original_filename"],
            "file_type": file_type,
            "query": analysis_prompt,
            "analysis": response.get("response", "Analysis failed"),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/stats")
async def get_knowledge_stats(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get statistics about the Knowledge Lab"""
    user_id = current_user.get("id") or current_user.get("_id")
    
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$file_type",
            "count": {"$sum": 1},
            "total_size": {"$sum": "$file_size"}
        }}
    ]
    
    results = await db.knowledge_documents.aggregate(pipeline).to_list(10)
    
    stats = {
        "document": {"count": 0, "total_size": 0},
        "image": {"count": 0, "total_size": 0},
        "video": {"count": 0, "total_size": 0},
    }
    
    for r in results:
        if r["_id"] in stats:
            stats[r["_id"]] = {
                "count": r["count"],
                "total_size": r["total_size"]
            }
    
    total_count = sum(s["count"] for s in stats.values())
    total_size = sum(s["total_size"] for s in stats.values())
    
    return {
        "total_documents": total_count,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "by_type": stats
    }
