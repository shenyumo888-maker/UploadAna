from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class AnalysisRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    topic: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.now)
    result_json: str  # 存储完整分析结果的 JSON 字符串
    sentiment_score: float
    sentiment_label: str
    report_markdown: str # 单独存储 markdown 报告，方便快速预览

class MultimodalTask(SQLModel, table=True):
    file_id: str = Field(primary_key=True)
    filename: str
    file_path: str
    status: str = Field(default="pending") # pending, processing, completed, failed
    task_id: Optional[str] = None # RQ task id
    result_json: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    error_message: Optional[str] = None

class ReportChatHistory(SQLModel, table=True):
    __tablename__ = "report_chat_history"
    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="analysisrecord.id", index=True)
    user_id: str = Field(index=True) # 简单用 sessionId 或 IP
    question: str
    answer: str
    refs: Optional[str] = None # JSON string: [{"id": "chart1", "desc": "..."}]
    created_at: datetime = Field(default_factory=datetime.now)
    feedback_like: Optional[bool] = None # True=Like, False=Dislike, None=No Action
    feedback_tags: Optional[str] = None # "事实错误,数据不符"

