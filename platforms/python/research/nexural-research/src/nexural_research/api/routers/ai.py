"""AI Strategy Analyst endpoints (BYOK — users provide their own API keys).

Features:
- Single-shot analysis with full metric context
- Multi-turn conversation with persistent context
- AI response validation against actual metric data
- Context preview
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from nexural_research.api.sessions import sessions, safe_serialize

router = APIRouter(tags=["ai"])


# ---------------------------------------------------------------------------
# Request/Response models
# ---------------------------------------------------------------------------

class AiRequest(BaseModel):
    api_key: str
    provider: str = "anthropic"
    message: str
    session_id: str = "default"


class AiMultiTurnRequest(BaseModel):
    api_key: str
    provider: str = "anthropic"
    messages: list[dict[str, str]]  # [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}, ...]
    session_id: str = "default"


class AiResponse(BaseModel):
    response: str
    provider: str
    context_tokens_approx: int


class AiValidatedResponse(BaseModel):
    response: str
    provider: str
    context_tokens_approx: int
    validation: dict  # ValidationResult as dict


# ---------------------------------------------------------------------------
# Single-shot analysis
# ---------------------------------------------------------------------------

@router.post("/ai/analyze", response_model=AiResponse)
async def ai_analyze(req: AiRequest):
    """Send trade data to AI for natural-language analysis."""
    from nexural_research.api.ai_analyst import (
        build_strategy_context,
        query_anthropic,
        query_openai,
        query_perplexity,
    )

    if req.session_id not in sessions:
        raise HTTPException(404, f"Session not found: {req.session_id}")
    s = sessions[req.session_id]
    if s["kind"] != "trades":
        raise HTTPException(400, "AI analysis requires Trades data")

    df = s["df"]
    context = build_strategy_context(df)

    try:
        if req.provider == "anthropic":
            response = await query_anthropic(req.api_key, context, req.message)
        elif req.provider == "openai":
            response = await query_openai(req.api_key, context, req.message)
        elif req.provider == "perplexity":
            response = await query_perplexity(req.api_key, context, req.message)
        else:
            raise HTTPException(400, f"Unsupported provider: {req.provider}")
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "auth" in error_msg.lower():
            raise HTTPException(401, "Invalid API key. Please check your key in Settings.")
        raise HTTPException(502, f"AI provider error: {error_msg}")

    return AiResponse(
        response=response,
        provider=req.provider,
        context_tokens_approx=len(context) // 4,
    )


# ---------------------------------------------------------------------------
# Multi-turn conversation
# ---------------------------------------------------------------------------

@router.post("/ai/conversation")
async def ai_conversation(req: AiMultiTurnRequest):
    """Multi-turn AI conversation with persistent strategy context.

    Send the full conversation history. The strategy context is automatically
    injected into the first message. Follow-ups reference the same data.
    """
    from nexural_research.api.ai_analyst import (
        build_strategy_context,
        SYSTEM_PROMPT,
    )
    import httpx

    if req.session_id not in sessions:
        raise HTTPException(404, f"Session not found: {req.session_id}")
    s = sessions[req.session_id]
    if s["kind"] != "trades":
        raise HTTPException(400, "AI analysis requires Trades data")

    df = s["df"]
    context = build_strategy_context(df)

    # Build messages with context in first user message
    api_messages = []
    context_injected = False
    for msg in req.messages:
        if msg["role"] == "user" and not context_injected:
            api_messages.append({
                "role": "user",
                "content": f"{context}\n\n---\n\nTrader's question: {msg['content']}",
            })
            context_injected = True
        else:
            api_messages.append(msg)

    try:
        if req.provider == "anthropic":
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": req.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 4096,
                        "system": SYSTEM_PROMPT,
                        "messages": api_messages,
                    },
                )
                resp.raise_for_status()
                response = resp.json()["content"][0]["text"]

        elif req.provider == "openai":
            messages_with_system = [{"role": "system", "content": SYSTEM_PROMPT}] + api_messages
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {req.api_key}", "Content-Type": "application/json"},
                    json={"model": "gpt-4o", "max_tokens": 4096, "messages": messages_with_system},
                )
                resp.raise_for_status()
                response = resp.json()["choices"][0]["message"]["content"]

        elif req.provider == "perplexity":
            messages_with_system = [{"role": "system", "content": SYSTEM_PROMPT}] + api_messages
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    "https://api.perplexity.ai/chat/completions",
                    headers={"Authorization": f"Bearer {req.api_key}", "Content-Type": "application/json"},
                    json={"model": "sonar-pro", "max_tokens": 4096, "messages": messages_with_system},
                )
                resp.raise_for_status()
                response = resp.json()["choices"][0]["message"]["content"]
        else:
            raise HTTPException(400, f"Unsupported provider: {req.provider}")

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "auth" in error_msg.lower():
            raise HTTPException(401, "Invalid API key.")
        raise HTTPException(502, f"AI provider error: {error_msg}")

    # Validate the AI response against actual data
    from nexural_research.api.ai_validator import validate_ai_response
    validation = validate_ai_response(response, df)

    return {
        "response": response,
        "provider": req.provider,
        "context_tokens_approx": len(context) // 4,
        "validation": {
            "total_claims": validation.total_claims,
            "verified": validation.verified,
            "contradicted": validation.contradicted,
            "unverifiable": validation.unverifiable,
            "confidence_score": validation.confidence_score,
            "details": [
                {
                    "claim": d.claim,
                    "metric": d.metric_name,
                    "ai_value": d.ai_value,
                    "actual_value": d.actual_value,
                    "status": d.status,
                    "difference_pct": d.difference_pct,
                }
                for d in validation.details
            ],
        },
        "conversation_length": len(req.messages),
    }


# ---------------------------------------------------------------------------
# Validate existing response
# ---------------------------------------------------------------------------

@router.post("/ai/validate")
async def ai_validate_response(session_id: str = Query(default="default"), response_text: str = ""):
    """Validate an AI response against actual metric data.

    Pass any AI-generated text and get back which claims are verified vs contradicted.
    """
    from nexural_research.api.ai_validator import validate_ai_response

    if session_id not in sessions:
        raise HTTPException(404, f"Session not found: {session_id}")
    s = sessions[session_id]
    if s["kind"] != "trades":
        raise HTTPException(400, "Validation requires Trades data")

    validation = validate_ai_response(response_text, s["df"])

    return {
        "total_claims": validation.total_claims,
        "verified": validation.verified,
        "contradicted": validation.contradicted,
        "confidence_score": validation.confidence_score,
        "details": [
            {
                "claim": d.claim,
                "metric": d.metric_name,
                "ai_value": d.ai_value,
                "actual_value": d.actual_value,
                "status": d.status,
                "difference_pct": d.difference_pct,
            }
            for d in validation.details
        ],
    }


# ---------------------------------------------------------------------------
# Context preview
# ---------------------------------------------------------------------------

@router.post("/ai/context-preview")
async def ai_context_preview(session_id: str = Query(default="default")):
    """Preview the context that would be sent to the AI."""
    from nexural_research.api.ai_analyst import build_strategy_context

    if session_id not in sessions:
        raise HTTPException(404, f"Session not found: {session_id}")
    s = sessions[session_id]
    if s["kind"] != "trades":
        raise HTTPException(400, "Context preview requires Trades data")

    context = build_strategy_context(s["df"])
    return {"context": context, "approx_tokens": len(context) // 4}
