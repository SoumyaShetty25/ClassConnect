import requests
import time
import sys

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
    print("\n--- Testing /ingest with sample_notes_biology.txt ---")
    with open("sample_notes_biology.txt", "rb") as f:
        files = {"file": ("sample_notes_biology.txt", f, "text/plain")}
        res = requests.post(f"{BASE_URL}/ingest", files=files)
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 200
    assert res.json().get("status") == "success"
    assert res.json().get("chunks_loaded") > 0
    print("Ingest test passed.")

def test_invalid_ingest():
    print("\n--- Testing /ingest with non-txt file ---")
    files = {"file": ("document.pdf", b"%PDF-1.4 dummy", "application/pdf")}
    res = requests.post(f"{BASE_URL}/ingest", files=files)
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 400
    assert "Only .txt files allowed" in res.json().get("detail", "")
    print("Invalid ingest validation passed.")

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

if __name__ == "__main__":
    if not wait_for_server():
        sys.exit(1)
    test_ingest()
    test_invalid_ingest()
    test_ask_valid()
    test_ask_photosynthesis()
    test_ask_out_of_scope_escalation()
    print("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===")
