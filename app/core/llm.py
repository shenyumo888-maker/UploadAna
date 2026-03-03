import dashscope
from http import HTTPStatus
from app.core.config import settings
from app.utils.logger import app_logger

dashscope.api_key = settings.DASHSCOPE_API_KEY

def call_qwen(prompt: str, model=settings.LLM_MODEL_NAME) -> str:
    app_logger.debug(f"Calling LLM: {model} with prompt length: {len(prompt)}")
    response = dashscope.Generation.call(
        model=model,
        prompt=prompt,
        result_format="message",
    )

    if response.status_code != HTTPStatus.OK:
        app_logger.error(f"LLM Call failed: {response.code} - {response.message}")
        raise RuntimeError(response.message)

    return response.output.choices[0].message.content
