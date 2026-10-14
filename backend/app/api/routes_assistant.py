from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter

from app.agents.project_assistant import project_assistant

router = APIRouter(prefix="/assistant", tags=["assistant"])

class CommandRequest(BaseModel):
    command: str

@router.post("/command")
def handle_assistant_command(payload: CommandRequest):
    """
    Executes a dynamic project command given by the user (via voice or text),
    operating tasks across leads, emails, swarms, and exports.
    """
    result = project_assistant.execute_command(payload.command)
    return result

@router.get("/overview")
def get_assistant_overview():
    """
    Returns the assistant's capabilities and current project summary.
    """
    return project_assistant.execute_command("status overview")
