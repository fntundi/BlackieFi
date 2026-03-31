"""Object storage integration (MinIO/S3 compatible)"""
import uuid
from typing import Tuple, Dict, Union, IO

import boto3
from botocore.client import Config

from services.secrets_service import decrypt_value


REQUIRED_FIELDS = {"endpoint_url", "bucket", "access_key", "secret_key"}


def normalize_storage_config(config: Dict) -> Dict:
    access_key = config.get("access_key") or config.get("access_key_enc")
    secret_key = config.get("secret_key") or config.get("secret_key_enc")
    if access_key and access_key == config.get("access_key_enc"):
        access_key = decrypt_value(access_key)
    if secret_key and secret_key == config.get("secret_key_enc"):
        secret_key = decrypt_value(secret_key)
    return {
        "provider": config.get("provider", "minio"),
        "endpoint_url": config.get("endpoint_url"),
        "bucket": config.get("bucket"),
        "access_key": access_key,
        "secret_key": secret_key,
        "region": config.get("region"),
        "secure": config.get("secure", True),
        "path_prefix": config.get("path_prefix", ""),
        "enabled": config.get("enabled", False)
    }


def storage_enabled(config: Dict) -> bool:
    if not config:
        return False
    normalized = normalize_storage_config(config)
    if not normalized.get("enabled"):
        return False
    return REQUIRED_FIELDS.issubset({k for k, v in normalized.items() if v})


def _get_client(config: Dict):
    return boto3.client(
        "s3",
        endpoint_url=config["endpoint_url"],
        aws_access_key_id=config["access_key"],
        aws_secret_access_key=config["secret_key"],
        region_name=config.get("region"),
        use_ssl=config.get("secure", True),
        config=Config(signature_version="s3v4")
    )


def build_storage_path(config: Dict, user_id: str, entity_id: str, extension: str) -> str:
    safe_ext = extension or "bin"
    prefix = config.get("path_prefix", "").strip("/")
    base = f"entities/{user_id}/{entity_id}/{uuid.uuid4()}.{safe_ext}"
    return f"{prefix}/{base}" if prefix else base


def put_object(config: Dict, path: str, data: Union[bytes, IO], content_type: str, size: int = None) -> dict:
    client = _get_client(config)
    if hasattr(data, "read"):
        client.upload_fileobj(
            data,
            Bucket=config["bucket"],
            Key=path,
            ExtraArgs={"ContentType": content_type}
        )
        return {"path": path, "size": size or 0}
    client.put_object(
        Bucket=config["bucket"],
        Key=path,
        Body=data,
        ContentType=content_type
    )
    return {"path": path, "size": len(data)}


def get_object(config: Dict, path: str) -> Tuple[bytes, str]:
    client = _get_client(config)
    response = client.get_object(Bucket=config["bucket"], Key=path)
    return response["Body"].read(), response.get("ContentType", "application/octet-stream")
