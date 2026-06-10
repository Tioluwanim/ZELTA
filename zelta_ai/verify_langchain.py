"""
Run this after pip install -r requirements.txt to confirm all
LangChain + LangGraph imports work with the existing Vertex AI setup.

Usage:
    python verify_langchain.py
"""
import os
import sys

print("Verifying LangChain + LangGraph imports for ZELTA AI Brain...")
print()

errors = []

# 1. Core LangChain
try:
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.tools import tool
    from langchain_core.output_parsers import StrOutputParser
    print("✓ langchain-core: messages, prompts, tools, parsers")
except ImportError as e:
    errors.append(f"✗ langchain-core: {e}")

# 2. LangChain Google Vertex AI
try:
    from langchain_google_vertexai import ChatVertexAI
    print("✓ langchain-google-vertexai: ChatVertexAI")
except ImportError as e:
    errors.append(f"✗ langchain-google-vertexai: {e}")

# 3. LangGraph
try:
    from langgraph.graph import StateGraph, END
    from langgraph.checkpoint.memory import MemorySaver
    print("✓ langgraph: StateGraph, END, MemorySaver")
except ImportError as e:
    errors.append(f"✗ langgraph: {e}")

# 4. Existing google-genai (must still work)
try:
    from google import genai
    from google.genai.types import GenerateContentConfig
    print("✓ google-genai: genai, GenerateContentConfig (existing SDK intact)")
except ImportError as e:
    errors.append(f"✗ google-genai: {e}")

# 5. Pydantic v2
try:
    import pydantic
    assert pydantic.VERSION.startswith("2.9"), f"Expected 2.9.x, got {pydantic.VERSION}"
    from pydantic import BaseModel, Field
    print(f"✓ pydantic: {pydantic.VERSION}")
except (ImportError, AssertionError) as e:
    errors.append(f"✗ pydantic: {e}")

# 6. Check Vertex AI environment variables
print()
print("Checking environment variables...")
required_env = [
    "GOOGLE_CLOUD_PROJECT",
    "GOOGLE_CLOUD_LOCATION",
    "GOOGLE_GENAI_USE_VERTEXAI",
    "VERTEX_GEMINI_MODEL",
]
for var in required_env:
    val = os.getenv(var)
    if val:
        # Mask sensitive values
        display = val if var in ("GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION", "VERTEX_GEMINI_MODEL") else "***set***"
        print(f"  ✓ {var}={display}")
    else:
        print(f"  ✗ {var} is NOT SET")
        errors.append(f"Missing env var: {var}")

# 7. Quick ChatVertexAI instantiation test (no actual API call)
print()
print("Testing ChatVertexAI model instantiation (no API call)...")
try:
    project = os.getenv("GOOGLE_CLOUD_PROJECT", "zelta-ai")
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    model_name = os.getenv("VERTEX_GEMINI_MODEL", "gemini-2.5-flash")
    # Instantiate without calling — just validates config
    llm = ChatVertexAI(
        model_name=model_name,
        project=project,
        location=location,
        temperature=0.3,
        max_output_tokens=500,
    )
    print(f"  ✓ ChatVertexAI({model_name}) instantiated")
except Exception as e:
    errors.append(f"ChatVertexAI instantiation failed: {e}")
    print(f"  ✗ {e}")

print()
if errors:
    print(f"FAILED — {len(errors)} error(s):")
    for err in errors:
        print(f"  {err}")
    sys.exit(1)
else:
    print("ALL CHECKS PASSED — LangChain is ready to use with Vertex AI")
    print()
    print("Next step: build brain/agent/student_model.py")