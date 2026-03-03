class AppError(Exception):
    """Base exception for application"""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)

class LLMError(AppError):
    """LLM service error"""
    def __init__(self, message: str):
        super().__init__(message, code="LLM_ERROR", status_code=503)

class SearchError(AppError):
    """Search service error"""
    def __init__(self, message: str):
        super().__init__(message, code="SEARCH_ERROR", status_code=503)

class DatabaseError(AppError):
    """Database operation error"""
    def __init__(self, message: str):
        super().__init__(message, code="DB_ERROR", status_code=500)
