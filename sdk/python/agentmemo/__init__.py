"""AgentMemo Python SDK — persistent memory for AI agents.

Sync client uses only the standard library (urllib). Optional async methods use
httpx if installed.
"""
from __future__ import annotations

import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Any, Optional

__version__ = "1.0.0"
__all__ = ["MemoryClient", "AgentMemoError"]

DEFAULT_BASE_URL = "https://agentmemo.dev"


class AgentMemoError(Exception):
    def __init__(self, message: str, status: int = 0, code: Optional[str] = None, body: Any = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.body = body


class MemoryClient:
    def __init__(self, api_key: str, base_url: str = DEFAULT_BASE_URL):
        if not api_key:
            raise AgentMemoError("api_key is required", code="no_api_key")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    # ---- internal -------------------------------------------------------
    def _req(self, method: str, path: str, body: Optional[dict] = None) -> dict:
        url = self.base_url + path
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Authorization": f"Bearer {self.api_key}"}
        if data is not None:
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode() or "{}")
        except urllib.error.HTTPError as e:
            payload = {}
            try:
                payload = json.loads(e.read().decode() or "{}")
            except Exception:
                pass
            msg = payload.get("error") if isinstance(payload, dict) else str(e)
            raise AgentMemoError(msg or "request failed", e.code, payload.get("code"), payload)

    @staticmethod
    def _qs(params: dict) -> str:
        clean = {k: v for k, v in params.items() if v is not None}
        return urllib.parse.urlencode(clean)

    # ---- API ------------------------------------------------------------
    def store(self, user_id: str, agent_id: str, content: str, metadata: dict = None,
              ttl_seconds: int = None, tags: list = None, namespace: str = "default",
              importance: int = 5, outcome: str = "unknown", detect_conflicts: bool = False) -> dict:
        return self._req("POST", "/memory/store", {
            "user_id": user_id, "agent_id": agent_id, "content": content,
            "metadata": metadata, "ttl_seconds": ttl_seconds, "tags": tags,
            "namespace": namespace, "importance": importance, "outcome": outcome,
            "detect_conflicts": detect_conflicts,
        })

    def search(self, user_id: str, query: str, agent_id: str = None, limit: int = 10,
               namespace: str = None, tags: list = None, min_importance: int = None) -> dict:
        qs = self._qs({
            "user_id": user_id, "q": query, "agent_id": agent_id, "limit": limit,
            "namespace": namespace, "tags": ",".join(tags) if tags else None,
            "min_importance": min_importance,
        })
        return self._req("GET", "/memory/retrieve?" + qs)

    def delete(self, id: str = None, user_id: str = None, agent_id: str = None) -> dict:
        return self._req("DELETE", "/memory/forget?" + self._qs({"id": id, "user_id": user_id, "agent_id": agent_id}))

    def context(self, user_id: str, agent_id: str = None, max_tokens: int = 2000, format: str = "raw") -> dict:
        return self._req("GET", "/memory/context?" + self._qs({
            "user_id": user_id, "agent_id": agent_id, "max_tokens": max_tokens, "format": format}))

    def feedback(self, memory_id: str, outcome: str, confidence: float = 1.0) -> dict:
        return self._req("POST", "/memory/feedback", {"memory_id": memory_id, "outcome": outcome, "confidence": confidence})

    def batch(self, memories: list) -> dict:
        return self._req("POST", "/memory/batch", {"memories": memories})

    def stats(self, user_id: str = None) -> dict:
        return self._req("GET", "/memory/stats?" + self._qs({"user_id": user_id}))

    def usage(self) -> dict:
        return self._req("GET", "/usage")

    # ---- async (requires httpx) ----------------------------------------
    async def async_store(self, **kwargs) -> dict:
        return await self._async_req("POST", "/memory/store", self._store_body(**kwargs))

    async def async_search(self, user_id: str, query: str, **kwargs) -> dict:
        qs = self._qs({"user_id": user_id, "q": query, **kwargs})
        return await self._async_req("GET", "/memory/retrieve?" + qs)

    def _store_body(self, user_id, agent_id, content, **kw):
        return {"user_id": user_id, "agent_id": agent_id, "content": content, **kw}

    async def _async_req(self, method: str, path: str, body: Optional[dict] = None) -> dict:
        try:
            import httpx  # optional dependency
        except ImportError as e:  # pragma: no cover
            raise AgentMemoError("async methods require 'httpx' (pip install httpx)") from e
        headers = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(base_url=self.base_url) as client:
            resp = await client.request(method, path, json=body, headers=headers)
            data = resp.json() if resp.content else {}
            if resp.status_code >= 400:
                raise AgentMemoError(data.get("error", "request failed"), resp.status_code, data.get("code"), data)
            return data

    @staticmethod
    def signup(name: str, base_url: str = DEFAULT_BASE_URL) -> dict:
        req = urllib.request.Request(
            base_url.rstrip("/") + "/signup",
            data=json.dumps({"name": name}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode() or "{}")
