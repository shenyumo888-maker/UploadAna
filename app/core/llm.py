import dashscope
from http import HTTPStatus
from app.core.config import DASHSCOPE_API_KEY

dashscope.api_key = DASHSCOPE_API_KEY

def call_qwen(prompt: str, model="qwen-plus") -> str:
    response = dashscope.Generation.call(
        model=model,
        prompt=prompt,
        result_format="message",
    )

    if response.status_code != HTTPStatus.OK:
        raise RuntimeError(response.message)

    return response.output.choices[0].message.content
