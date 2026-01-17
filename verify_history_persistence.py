
import asyncio
import sys
import os

# Adjust path to include project root
sys.path.append(os.path.join(os.getcwd(), "backend/src"))

from backend.main import app
from backend.services.chat_session_service import ChatSessionService
from backend.services.firestore_client import FirestoreClient
from backend.models.chat import AddMessageRequest, MessageRole

async def verify_flow():
    print("Starting Verification...")
    
    # 1. Setup
    firestore = FirestoreClient()
    chat_service = ChatSessionService()
    
    # Find a valid doc_id to test with (just pick the first one)
    docs = await firestore.list_documents(limit=1)
    if not docs:
        print("No documents found to test with.")
        return

    doc_id = docs[0]['doc_id']
    user_id = docs[0].get('user_id', 'test_user')
    print(f"Testing with Doc ID: {doc_id}, User ID: {user_id}")
    
    # 2. Simulate Initial Analysis (we'll just manually call the logic to be safe/fast)
    # or better, use the service directly to create what the endpoint creates
    
    # Clean up any existing sessions for this doc to start fresh (optional, but good for clarity)
    # For safety, let's just create a NEW session like the endpoint does
    
    from backend.models.chat import CreateChatSessionRequest
    
    print("\n--- Creating Initial Session (Simulating /initial) ---")
    create_req = CreateChatSessionRequest(
        user_id=user_id,
        title=f"Test Chat: {doc_id}",
        selected_document_ids=[doc_id]
    )
    session, _ = await chat_service.create_session(create_req)
    session_id = session.session_id
    print(f"Created Session ID: {session_id}")
    
    # Add initial analysis
    await chat_service.add_message(
        session_id,
        AddMessageRequest(
            role=MessageRole.ASSISTANT,
            content="Initial Analysis Message"
        )
    )
    print("Added Initial Analysis Message")
    
    # 3. Simulate User Question (Simulating /ask)
    print("\n--- Sending User Message (Simulating /ask) ---")
    from backend.models.chat import ChatQuestionRequest
    from backend.services.qa_service import QAService
    from fastapi import BackgroundTasks
    
    qa_service = QAService()
    
    # We need to mock the Gemini client to avoid real API calls/costs/latency for this test
    # OR, we just check if the message persistence part works.
    # Let's call `ask_chat_question` BUT checking persistence of USER message which happens BEFORE Gemini.
    
    # Mocking Gemini Client answer_question to return dummy immediately
    async def mock_answer(*args, **kwargs):
        return {
            "answer": "Mock Answer",
            "used_clause_ids": [],
            "confidence": 1.0,
            "additional_insights": None
        }
    qa_service.gemini_client.answer_question = mock_answer
    
    req = ChatQuestionRequest(
        session_id=session_id,
        question="Test User Question",
        include_conversation_history=True
    )
    
    bg_tasks = BackgroundTasks()
    
    try:
        response = await qa_service.ask_chat_question(
            session_id=session_id,
            request=req,
            background_tasks=bg_tasks
        )
        print("Q&A Service returned successfully")
    except Exception as e:
        print(f"Q&A Service FAILED: {e}")
        import traceback
        traceback.print_exc()
        return

    # 4. Verify Messages in Firestore
    print("\n--- Verifying Persistence ---")
    messages = await chat_service._get_session_messages(session_id)
    print(f"Total Messages Found: {len(messages)}")
    
    for msg in messages:
        print(f"[{msg.role.value}] {msg.content}")

    expected_count = 3 # Initial Analysis + User Question + Assistant Answer
    if len(messages) >= expected_count:
        print("\nSUCCESS: All messages persisted.")
    else:
        print(f"\nFAILURE: Expected {expected_count} messages, found {len(messages)}")

if __name__ == "__main__":
    asyncio.run(verify_flow())
