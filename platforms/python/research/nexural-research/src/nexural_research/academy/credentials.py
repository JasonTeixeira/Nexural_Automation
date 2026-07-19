"""HMAC-signed local Academy credentials with expiry and tamper detection."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any


@dataclass(frozen=True)
class VerifiedCredential:
    subject: str
    credential: str
    evidence: tuple[str, ...]
    issued_at: str
    expires_at: str
    issuer: str


class CredentialIssuer:
    def __init__(self, signing_key: bytes, *, issuer: str = "nexural-academy") -> None:
        if len(signing_key) < 24:
            raise ValueError("Credential signing key must contain at least 24 bytes")
        self._key = signing_key
        self.issuer = issuer

    def issue(
        self,
        subject: str,
        credential: str,
        evidence: list[str] | tuple[str, ...],
        *,
        valid_days: int = 365,
        now: datetime | None = None,
    ) -> str:
        current = (now or datetime.now(UTC)).astimezone(UTC)
        payload = {
            "subject": subject,
            "credential": credential,
            "evidence": sorted(set(evidence)),
            "issued_at": current.isoformat(),
            "expires_at": (current + timedelta(days=valid_days)).isoformat(),
            "issuer": self.issuer,
        }
        header = {"alg": "HS256", "typ": "NEXURAL-CREDENTIAL", "v": 1}
        signing_input = f"{_encode(header)}.{_encode(payload)}"
        signature = hmac.new(self._key, signing_input.encode(), hashlib.sha256).digest()
        return f"{signing_input}.{_b64(signature)}"

    def verify(self, token: str, *, now: datetime | None = None) -> VerifiedCredential:
        try:
            encoded_header, encoded_payload, encoded_signature = token.split(".")
            signing_input = f"{encoded_header}.{encoded_payload}"
            signature = _unb64(encoded_signature)
            expected = hmac.new(self._key, signing_input.encode(), hashlib.sha256).digest()
            if not hmac.compare_digest(signature, expected):
                raise ValueError("Credential signature is invalid")
            header = _decode(encoded_header)
            payload = _decode(encoded_payload)
        except (KeyError, TypeError, json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ValueError("Malformed credential") from exc
        if header != {"alg": "HS256", "typ": "NEXURAL-CREDENTIAL", "v": 1}:
            raise ValueError("Unsupported credential header")
        if payload.get("issuer") != self.issuer:
            raise ValueError("Credential issuer mismatch")
        current = (now or datetime.now(UTC)).astimezone(UTC)
        expires = datetime.fromisoformat(payload["expires_at"])
        if current > expires:
            raise ValueError("Credential has expired")
        return VerifiedCredential(
            subject=str(payload["subject"]),
            credential=str(payload["credential"]),
            evidence=tuple(map(str, payload["evidence"])),
            issued_at=str(payload["issued_at"]),
            expires_at=str(payload["expires_at"]),
            issuer=str(payload["issuer"]),
        )


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _encode(value: dict[str, Any]) -> str:
    return _b64(json.dumps(value, sort_keys=True, separators=(",", ":")).encode())


def _decode(value: str) -> dict[str, Any]:
    payload = json.loads(_unb64(value))
    if not isinstance(payload, dict):
        raise ValueError("Credential segment must be an object")
    return payload
