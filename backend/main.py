import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from httpx import Timeout, RequestError
from pathlib import Path
import asyncio
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("no groq key")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
CONVERSATIONS_FILE = Path("conversations.json")
SESSION_TIMEOUT = 60 * 15  

if CONVERSATIONS_FILE.exists():
    with open(CONVERSATIONS_FILE, "r", encoding="utf-8") as f:
        chat_history = json.load(f)
else:
    chat_history = {}

def save_conversations():
    with open(CONVERSATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(chat_history, f, ensure_ascii=False, indent=4)

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    chat_history.setdefault(session_id, [])
    last_activity = asyncio.get_event_loop().time()

    try:
        while True:
            data = await websocket.receive_text()
            chat_history[session_id].append({"user": data})
            save_conversations()

            last_activity = asyncio.get_event_loop().time()

            payload = {"messages": [{"role": "user", "content": data}], "model": "llama-3.1-8b-instant"}
            try:
                async with httpx.AsyncClient(timeout=Timeout(30)) as client:
                    response = await client.post(GROQ_API_URL, headers={"Authorization": f"Bearer {GROQ_API_KEY}"}, json=payload)
                    response.raise_for_status()
                    ai_data = response.json()
                    ai_response = ai_data.get("choices", [{}])[0].get("message", {}).get("content", "no response")
                    await websocket.send_text(ai_response)

            except httpx.RequestError as e:
                await websocket.send_text(f"groq api messed up: {str(e)}")
                return
            except Exception as e:
                await websocket.send_text(f"whoops! something went wrong: {str(e)}")
                return

            chat_history[session_id].append({"ai": ai_response})
            save_conversations()

    except WebSocketDisconnect:
        save_conversations()

    if asyncio.get_event_loop().time() - last_activity > SESSION_TIMEOUT:
        del chat_history[session_id]
        save_conversations()

@app.get("/conversations")
def get_all_conversations():
    return [{"id": session_id, "messages": history} for session_id, history in chat_history.items()]

@app.get("/history/{session_id}")
def get_chat_history(session_id: str):
    return chat_history.get(session_id, [])

@app.delete("/conversations/{session_id}")
def delete_conversation(session_id: str):
    if session_id not in chat_history:
        raise HTTPException(status_code=404, detail="not found")
    del chat_history[session_id]
    save_conversations()
    return {"message": f"deleted {session_id}"}

@app.post("/conversations")
def create_conversation(conversation_data: dict):
    session_id = conversation_data.get("session_id")
    if session_id in chat_history:
        raise HTTPException(status_code=400, detail="already exists")
    
    chat_history[session_id] = []
    save_conversations()
    return {"message": f"created {session_id}"}
