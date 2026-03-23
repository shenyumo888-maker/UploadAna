import json
from datetime import datetime
from sqlmodel import Session
from app.core.database import engine
from app.models.db_models import MultimodalTask
from app.agents.video_agent import vl_analysis

from app.utils.logger import app_logger

def process_multimodal_task(file_id: str, file_path: str):
    """
    RQ Worker 调用的异步任务函数
    """
    app_logger.info(f"[Worker] Starting task for file_id: {file_id}")
    
    with Session(engine) as session:
        # 1. 获取任务记录
        task = session.get(MultimodalTask, file_id)
        if not task:
            app_logger.error(f"[Worker] Task not found for file_id: {file_id}")
            return
            
        # 2. 更新状态为处理中
        task.status = "processing"
        task.updated_at = datetime.now()
        session.add(task)
        session.commit()
        
        try:
            # 3. 执行多模态分析
            # 模拟耗时 (如果文件很小，DashScope 返回太快，前端进度条可能来不及反应)
            # time.sleep(1) 
            
            result = vl_analysis(file_path)
            
            # 4. 检查结果
            if "error" in result:
                task.status = "failed"
                task.error_message = result["error"]
            else:
                task.status = "completed"
                task.result_json = json.dumps(result, ensure_ascii=False)
                
        except Exception as e:
            app_logger.error(f"[Worker] Error processing task: {e}")
            task.status = "failed"
            task.error_message = str(e)
            
        # 5. 保存最终状态
        task.updated_at = datetime.now()
        session.add(task)
        session.commit()
        app_logger.info(f"[Worker] Task {file_id} finished with status: {task.status}")
