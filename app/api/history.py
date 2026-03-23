from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.db_models import AnalysisRecord

router = APIRouter()

@router.get("/history", response_model=List[AnalysisRecord])
def get_history(session: Session = Depends(get_session)):
    statement = select(AnalysisRecord).order_by(AnalysisRecord.created_at.desc())
    results = session.exec(statement).all()
    # 为了列表页性能，可以在这里把 heavy 的 result_json 或 report_markdown 设为空，或者前端只取需要的字段
    # 这里先简单返回全部，如果是生产环境应该定义一个 AnalysisRecordReadLite 模型
    return results

@router.get("/history/{record_id}", response_model=AnalysisRecord)
def get_history_detail(record_id: int, session: Session = Depends(get_session)):
    record = session.get(AnalysisRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    return record

@router.delete("/history/clear/all")
def clear_all_history(session: Session = Depends(get_session)):
    statement = select(AnalysisRecord)
    records = session.exec(statement).all()
    for record in records:
        session.delete(record)
    session.commit()
    return {"ok": True}

@router.delete("/history/{record_id}")
def delete_history(record_id: int, session: Session = Depends(get_session)):
    record = session.get(AnalysisRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    session.delete(record)
    session.commit()
    return {"ok": True}
