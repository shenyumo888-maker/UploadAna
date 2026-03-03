import json
import re
from typing import Any, Dict, Optional, Union
from app.utils.logger import app_logger

def parse_llm_json(content: str) -> Dict[str, Any]:
    """
    Parse JSON from LLM response.
    Handles Markdown code blocks and raw JSON strings.
    """
    if not content:
        return {}

    # 1. Try direct JSON parsing
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # 2. Try extracting from Markdown code blocks (```json ... ```)
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Try finding the first '{' and last '}'
    try:
        match = re.search(r'(\{.*\})', content, re.DOTALL)
        if match:
            return json.loads(match.group(1))
    except (json.JSONDecodeError, AttributeError):
        pass

    app_logger.warning(f"Failed to parse JSON from LLM response: {content[:100]}...")
    return {}
