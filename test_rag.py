import requests
import time
import sys
import os

BASE_URL = "http://localhost:8000"

def wait_for_server(timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{BASE_URL}/docs", timeout=2)
            if r.status_code == 200:
                print("Server is healthy and ready.")
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
    print("Timed out waiting for server.")
    return False

def test_ingest():
    print("\n--- Testing /ingest with notes/sample_notes_biology.txt ---")
    filepath = os.path.join("notes", "sample_notes_biology.txt")
    with open(filepath, "rb") as f:
        files = {"file": ("sample_notes_biology.txt", f, "text/plain")}
        res = requests.post(f"{BASE_URL}/ingest", files=files)
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 200
    assert res.json().get("status") == "success"
    assert res.json().get("chunks_loaded") > 0
    print("Ingest test passed.")

def test_invalid_ingest():
    print("\n--- Testing /ingest with unsupported file (.png) ---")
    files = {"file": ("diagram.png", b"\x89PNG\r\n\x1a\n dummy", "image/png")}
    res = requests.post(f"{BASE_URL}/ingest", files=files)
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 400
    assert "Only .txt, .pdf, and .docx files allowed" in res.json().get("detail", "")
    print("Invalid ingest validation passed.")

def test_ingest_pdf():
    print("\n--- Testing /ingest with notes/sample_lecture_quantum.pdf ---")
    filepath = os.path.join("notes", "sample_lecture_quantum.pdf")
    with open(filepath, "rb") as f:
        files = {"file": ("sample_lecture_quantum.pdf", f, "application/pdf")}
        res = requests.post(f"{BASE_URL}/ingest", files=files)
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 200
    assert res.json().get("status") == "success"
    assert res.json().get("chunks_loaded") > 0
    print("PDF ingest test passed.")

def test_ask_pdf():
    print("\n--- Testing /ask for PDF content ---")
    query = "In quantum computing, what states can qubits exist in?"
    res = requests.post(f"{BASE_URL}/ask", json={"query": query})
    print("Status:", res.status_code)
    print("Response:", res.json())
    data = res.json()
    assert res.status_code == 200
    assert data.get("status") == "answered"
    assert "sample_lecture_quantum.pdf" in data.get("citations", [])
    print("PDF question answered successfully.")

def test_ask_valid():
    print("\n--- Testing /ask with in-scope question ---")
    query = "What is the function of mitochondria and what role do cristae play?"
    res = requests.post(f"{BASE_URL}/ask", json={"query": query})
    print("Status:", res.status_code)
    print("Response:", res.json())
    data = res.json()
    assert res.status_code == 200
    assert data.get("status") == "answered"
    assert "sample_notes_biology.txt" in data.get("citations", [])
    assert len(data.get("answer", "")) > 10
    print("In-scope ask test passed.")

def test_ask_photosynthesis():
    print("\n--- Testing /ask with another in-scope question ---")
    query = "What is the chemical equation for photosynthesis?"
    res = requests.post(f"{BASE_URL}/ask", json={"query": query})
    print("Status:", res.status_code)
    print("Response:", res.json())
    data = res.json()
    assert res.status_code == 200
    assert data.get("status") == "answered"
    print("Photosynthesis ask test passed.")

def test_ask_out_of_scope_escalation():
    print("\n--- Testing /ask with out-of-scope question (Escalation) ---")
    query = "Who was Napoleon Bonaparte and when was the battle of Waterloo?"
    res = requests.post(f"{BASE_URL}/ask", json={"query": query})
    print("Status:", res.status_code)
    print("Response:", res.json())
    data = res.json()
    assert res.status_code == 200
    print(f"Result status: {data.get('status')} (Reason: {data.get('reason')})")
    print("Escalation check completed.")

def test_ingest_docx():
    print("\n--- Testing /ingest with notes/sample_history_renaissance.docx ---")
    filepath = os.path.join("notes", "sample_history_renaissance.docx")
    with open(filepath, "rb") as f:
        files = {"file": ("sample_history_renaissance.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        res = requests.post(f"{BASE_URL}/ingest", files=files)
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 200
    assert res.json().get("status") == "success"
    assert res.json().get("chunks_loaded") > 0
    print("DOCX ingest test passed.")

def test_ask_docx():
    print("\n--- Testing /ask for DOCX content ---")
    query = "Who invented the movable-type printing press and around what year?"
    res = requests.post(f"{BASE_URL}/ask", json={"query": query})
    print("Status:", res.status_code)
    print("Response:", res.json())
    data = res.json()
    assert res.status_code == 200
    assert data.get("status") == "answered"
    assert "sample_history_renaissance.docx" in data.get("citations", [])
    print("DOCX question answered successfully.")

if __name__ == "__main__":
    if not wait_for_server():
        sys.exit(1)
    test_ingest()
    test_ingest_pdf()
    test_ingest_docx()
    test_invalid_ingest()
    test_ask_valid()
    test_ask_photosynthesis()
    test_ask_pdf()
    test_ask_docx()
    test_ask_out_of_scope_escalation()
    print("\n=== ALL TESTS (TXT + PDF + DOCX + ESCALATION) COMPLETED SUCCESSFULLY ===")
