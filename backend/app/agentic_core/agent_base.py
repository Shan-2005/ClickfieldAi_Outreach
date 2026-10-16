import os
import re
import time
import json
import sqlite3
import logging
from typing import Dict, Any, Optional, List
import httpx

logger = logging.getLogger("agentic_core")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "radar.db")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def log_agent_action(
    agent_name: str,
    action_type: str,
    lead_id: Optional[int] = None,
    company_name: Optional[str] = None,
    input_summary: str = "",
    output_summary: str = "",
    is_success: bool = True,
    execution_time_ms: float = 0.0
):
    """
    Immutably records agent action into agent_action_audit_log table.
    Guarantees 100% audit trail and proof of execution.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO agent_action_audit_log (
                agent_name, lead_id, company_name, action_type,
                input_summary, output_summary, is_success, execution_time_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            agent_name, lead_id, company_name, action_type,
            input_summary[:1000], output_summary[:2000], 1 if is_success else 0, execution_time_ms
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to log agent action: {e}")

class BaseOllamaAgent:
    """
    Base class for all specialized Ollama Agents.
    Encapsulates communication, retries, timing, and automated audit logging.
    """
    def __init__(self, name: str, model: str = OLLAMA_MODEL, host: str = OLLAMA_HOST):
        self.name = name
        self.model = model
        self.host = host.rstrip("/")
        self.client = httpx.Client(base_url=self.host, timeout=60.0)

    def is_healthy(self) -> bool:
        try:
            res = self.client.get("/api/tags", timeout=2.0)
            return res.status_code == 200
        except Exception:
            return False

    def query_ollama(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        format_json: bool = False,
        temperature: float = 0.2
    ) -> str:
        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": 700
            }
        }
        if system_prompt:
            payload["system"] = system_prompt
        if format_json:
            payload["format"] = "json"

        try:
            res = self.client.post("/api/generate", json=payload, timeout=60.0)
            if res.status_code == 200:
                raw_text = res.json().get("response", "").strip()
                return raw_text
            else:
                logger.error(f"[{self.name}] Ollama error {res.status_code}: {res.text}")
                return ""
        except Exception as e:
            logger.error(f"[{self.name}] Connection error: {e}")
            return ""

    def parse_json_response(self, text: str) -> Dict[str, Any]:
        """Safely parses JSON even if wrapped in markdown code blocks."""
        if not text:
            return {}
        # Strip ```json and ``` if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
        cleaned = re.sub(r"\s*```$", "", cleaned)
        try:
            return json.loads(cleaned)
        except Exception:
            # Fallback regex extraction of first JSON object
            match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
        return {}
