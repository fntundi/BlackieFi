"""Secret encryption utilities for stored credentials"""
import os
from cryptography.fernet import Fernet


_cached_fernet = None


def _get_fernet() -> Fernet:
    global _cached_fernet
    if _cached_fernet:
        return _cached_fernet
    key = os.environ.get("STORAGE_SECRET_KEY")
    if not key:
        raise RuntimeError("STORAGE_SECRET_KEY must be set to encrypt storage credentials")
    _cached_fernet = Fernet(key.encode("utf-8"))
    return _cached_fernet


def encrypt_value(value: str) -> str:
    if value is None:
        return None
    fernet = _get_fernet()
    return fernet.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_value(value: str) -> str:
    if not value:
        return None
    fernet = _get_fernet()
    return fernet.decrypt(value.encode("utf-8")).decode("utf-8")
