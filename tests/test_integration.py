import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
import os

client = TestClient(app)

class TestMultimodalAPI(unittest.TestCase):
    
    @patch('app.api.multimodal.task_queue')
    def test_upload_and_status(self, mock_queue):
        # Mock Redis queue enqueue
        mock_job = MagicMock()
        mock_job.id = "mock_task_id"
        mock_queue.enqueue.return_value = mock_job
        
        # Create a dummy file
        file_content = b"fake content"
        files = {"file": ("test.jpg", file_content, "image/jpeg")}
        
        # Test Upload
        response = client.post("/api/multimodal/upload", files=files)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("file_id", data)
        self.assertEqual(data["task_id"], "mock_task_id")
        
        file_id = data["file_id"]
        
        # Test Status (Pending/Processing since we mocked queue but didn't run worker)
        # Note: In our implementation, we create DB record first.
        # Since TestClient runs in same process, it shares the DB (sqlite).
        
        response_status = client.get(f"/api/multimodal/status/{file_id}")
        self.assertEqual(response_status.status_code, 200)
        status_data = response_status.json()
        self.assertEqual(status_data["file_id"], file_id)
        # Status should be 'pending' because we mocked enqueue and didn't update DB status
        self.assertEqual(status_data["status"], "pending")
        
        # Clean up
        upload_path = f"app/static/uploads/{file_id}.jpg"
        if os.path.exists(upload_path):
            os.remove(upload_path)

if __name__ == '__main__':
    unittest.main()
