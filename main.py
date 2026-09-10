from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from sentence_transformers import SentenceTransformer
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import uvicorn
import os

load_dotenv()

app = FastAPI(title="Academic AI - RAG Engine")

# CORS — allows frontend to call this API from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock this down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory vector DB
chroma_client = chromadb.Client() 
collection = chroma_client.get_or_create_collection(name="fast_notes")

embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.1,
    api_key=os.getenv("GROQ_API_KEY")
)

class QueryRequest(BaseModel):
    query: str

@app.post("/ingest")
async def ingest_txt(file: UploadFile = File(...)):
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files allowed.")
    
    content = await file.read()
    text = content.decode("utf-8")
    
    chunk_size = 500
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    
    embeddings = embedder.encode(chunks).tolist()
    ids = [f"{file.filename}_{i}" for i in range(len(chunks))]
    metadatas = [{"source": file.filename} for _ in chunks]
    
    collection.add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)
    return {"status": "success", "chunks_loaded": len(chunks)}

@app.post("/ask")
async def ask_question(payload: QueryRequest):
    query_vector = embedder.encode([payload.query]).tolist()
    results = collection.query(query_embeddings=query_vector, n_results=2)
    
    if not results["documents"][0]:
        return {"status": "escalated_to_teacher", "reason": "No notes uploaded yet."}
        
    distance = results["distances"][0][0]
    
    if distance > 0.7:
         return {"status": "escalated_to_teacher", "reason": "Low confidence match."}
         
    context = "\n".join(results["documents"][0])
    prompt = f"Answer strictly using this context:\n{context}\n\nQuestion: {payload.query}\nAnswer:"
    
    answer = llm.invoke(prompt)
    
    return {
        "status": "answered",
        "answer": answer.content.strip(),
        "citations": [results["metadatas"][0][0]["source"]]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
