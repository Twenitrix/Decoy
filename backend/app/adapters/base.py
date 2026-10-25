from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseToolAdapter(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the registered tool."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Description and usage info."""
        pass

    @abstractmethod
    def execute(self, parameters: Dict[str, Any], agent_context: Dict[str, Any]) -> Dict[str, Any]:
        """Executes the tool with validated parameters."""
        pass
