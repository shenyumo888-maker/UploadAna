import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session
from app.core.database import get_session
from app.models.db_models import MultimodalTask
from app.core.queue import task_queue
from app.services.multimodal_service import process_multimodal_task

from app.utils.logger import app_logger

router = APIRouter()

UPLOAD_DIR = "app/static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    session: Session = Depends(get_session)
):
    """
    接收前端上传的视频或图片，生成 file_id，并加入任务队列
    """
    # 1. 生成唯一 file_id
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    save_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, save_filename)
    abs_path = os.path.abspath(file_path)

    # 2. 保存文件
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

    # 3. 创建任务记录
    new_task = MultimodalTask(
        file_id=file_id,
        filename=file.filename,
        file_path=abs_path,
        status="pending"
    )
    session.add(new_task)
    session.commit()
    session.refresh(new_task)

    # 4. 提交到 Redis 队列
    rq_job_id = None
    if task_queue:
        try:
            job = task_queue.enqueue(
                process_multimodal_task, 
                args=(file_id, abs_path),
                job_timeout='10m' # 视频分析可能耗时较长
            )
            rq_job_id = job.id
            new_task.task_id = rq_job_id
            session.add(new_task)
            session.commit()
        except Exception as e:
            # 队列连接失败，降级处理或报错
            app_logger.error(f"Redis Queue Error: {e}")
            # 这里可以选择直接同步运行，或者报错
            # 为了满足需求中的稳定性，如果队列挂了，我们可以尝试同步运行或者报错
            # 简单起见，这里报错提示后端服务异常
            new_task.status = "failed"
            new_task.error_message = "Task queue unavailable"
            session.add(new_task)
            session.commit()
            return JSONResponse(
                status_code=503, 
                content={"error": "Analysis service unavailable (Queue error)"}
            )
    else:
        # 如果没有配置 Redis，直接报错（根据需求必须用队列）
        # 或者为了开发方便，如果没有 Redis，同步运行（可选）
        app_logger.warning("Warning: Redis queue not configured. Running synchronously (not recommended for production).")
        try:
            process_multimodal_task(file_id, abs_path)
            session.refresh(new_task)
        except Exception:
            pass

    return {
        "file_id": file_id,
        "task_id": rq_job_id,
        "status": new_task.status,
        "message": "File uploaded and analysis queued"
    }

@router.get("/status/{file_id}")
async def get_task_status(file_id: str, session: Session = Depends(get_session)):
    """
    查询任务状态
    """
    task = session.get(MultimodalTask, file_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "file_id": task.file_id,
        "status": task.status,
        "result": task.result_json, # JSON 字符串，前端需要 parse
        "error": task.error_message,
        "created_at": task.created_at,
        "updated_at": task.updated_at
    }
