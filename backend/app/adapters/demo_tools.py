from typing import Dict, Any
from backend.app.adapters.base import BaseToolAdapter

class ReadFileTool(BaseToolAdapter):
    @property
    def name(self) -> str:
        return "read_file"

    @property
    def description(self) -> str:
        return "Reads file content from authorized internal document repositories."

    def execute(self, parameters: Dict[str, Any], agent_context: Dict[str, Any]) -> Dict[str, Any]:
        file_id = parameters.get("file_id") or parameters.get("path", "default.txt")
        return {
            "status": "success",
            "message": f"Successfully retrieved content for '{file_id}'.",
            "bytes_read": 1024,
            "resource": file_id
        }

class QueryDatabaseTool(BaseToolAdapter):
    @property
    def name(self) -> str:
        return "query_database"

    @property
    def description(self) -> str:
        return "Executes read-only analytical queries against authorized tables."

    def execute(self, parameters: Dict[str, Any], agent_context: Dict[str, Any]) -> Dict[str, Any]:
        table = parameters.get("table", "general_metrics")
        return {
            "status": "success",
            "records_count": 15,
            "table": table,
            "data": [{"id": 1, "status": "active"}, {"id": 2, "status": "verified"}]
        }

class CallExternalApiTool(BaseToolAdapter):
    @property
    def name(self) -> str:
        return "call_external_api"

    @property
    def description(self) -> str:
        return "Dispatches outbound REST requests to verified external endpoints."

    def execute(self, parameters: Dict[str, Any], agent_context: Dict[str, Any]) -> Dict[str, Any]:
        endpoint = parameters.get("endpoint", "api.partner.org")
        method = parameters.get("method", "GET")
        return {
            "status": "success",
            "endpoint": endpoint,
            "method": method,
            "response_code": 200,
            "result": "Payload accepted by partner service."
        }

class SendEmailTool(BaseToolAdapter):
    @property
    def name(self) -> str:
        return "send_email"

    @property
    def description(self) -> str:
        return "Sends notifications to approved recipient domains."

    def execute(self, parameters: Dict[str, Any], agent_context: Dict[str, Any]) -> Dict[str, Any]:
        to = parameters.get("to", "operator@example.com")
        subject = parameters.get("subject", "Automated Notice")
        return {
            "status": "success",
            "recipient": to,
            "subject": subject,
            "delivered": True
        }

class ExecuteWorkflowTool(BaseToolAdapter):
    @property
    def name(self) -> str:
        return "execute_workflow"

    @property
    def description(self) -> str:
        return "Triggers automated pipeline tasks."

    def execute(self, parameters: Dict[str, Any], agent_context: Dict[str, Any]) -> Dict[str, Any]:
        workflow_id = parameters.get("workflow_id", "wf-001")
        return {
            "status": "success",
            "workflow_id": workflow_id,
            "state": "completed",
            "execution_time_ms": 42
        }

class EditFileTool(BaseToolAdapter):
    @property
    def name(self) -> str:
        return "edit_file"

    @property
    def description(self) -> str:
        return "Safely modifies authorized target files within policy bounds."

    def execute(self, parameters: Dict[str, Any], agent_context: Dict[str, Any]) -> Dict[str, Any]:
        target = parameters.get("path") or parameters.get("file_id", "style.css")
        return {
            "status": "success",
            "message": f"Successfully edited file '{target}'.",
            "lines_modified": 12,
            "file": target
        }

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseToolAdapter] = {}
        self.register(ReadFileTool())
        self.register(QueryDatabaseTool())
        self.register(CallExternalApiTool())
        self.register(SendEmailTool())
        self.register(ExecuteWorkflowTool())
        self.register(EditFileTool())

    def register(self, tool: BaseToolAdapter):
        self._tools[tool.name] = tool

    def get(self, name: str) -> BaseToolAdapter:
        return self._tools.get(name)

    def is_registered(self, name: str) -> bool:
        return name in self._tools

    def list_tools(self) -> Dict[str, str]:
        return {name: tool.description for name, tool in self._tools.items()}

tool_registry = ToolRegistry()
