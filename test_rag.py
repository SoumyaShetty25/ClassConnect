"""
ClassConnect End-to-End Test Suite
Tests all 3 endpoints of the ClassConnect Academic Intelligence API:
1. POST /upload (PDF ingestion)
2. POST /ask-socratic (In-scope Q&A + Out-of-scope escalation)
3. POST /triage (Emergency exam study plan generation)
"""

import requests
import time
import sys
import os

BASE_URL = "http://localhost:8000"

def wait_for_server(timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{BASE_URL}/", timeout=2)
            if r.status_code == 200:
                print("ClassConnect Server is healthy and ready.")
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
    print("Timed out waiting for server.")
    return False

def test_upload_pdf():
    print("\n--- 1. Testing POST /upload with PDF ---")
    filepath = os.path.join("notes", "Introduction to Psychology.pdf")
    if not os.path.exists(filepath):
        filepath = os.path.join("notes", "sample_lecture_quantum.pdf")
    
    with open(filepath, "rb") as f:
        files = {"file": (os.path.basename(filepath), f, "application/pdf")}
        res = requests.post(f"{BASE_URL}/upload", files=files)
    
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 200
    assert res.json().get("status") == "success"
    assert res.json().get("chunks_stored") > 0
    print("Upload PDF passed.")

def test_upload_invalid_file():
    print("\n--- Testing POST /upload with invalid non-PDF file ---")
    files = {"file": ("notes.txt", b"just some text", "text/plain")}
    res = requests.post(f"{BASE_URL}/upload", files=files)
    print("Status:", res.status_code)
    assert res.status_code == 400
    print("Non-PDF rejection passed.")

def test_ask_socratic_in_scope():
    print("\n--- 2. Testing POST /ask-socratic (In-scope question) ---")
    res = requests.post(f"{BASE_URL}/ask-socratic", json={"question": "What is psychology?"})
    print("Status:", res.status_code)
    data = res.json()
    print("Response:", data)
    assert res.status_code == 200
    assert data.get("status") == "success"
    assert "answer" in data
    assert len(data.get("sources", [])) > 0
    print("Socratic tutor in-scope passed.")

def test_ask_socratic_escalation():
    print("\n--- Testing POST /ask-socratic (Out-of-scope escalation) ---")
    res = requests.post(f"{BASE_URL}/ask-socratic", json={"question": "What is the atomic mass of Californium?"})
    print("Status:", res.status_code)
    data = res.json()
    print("Response:", data)
    assert res.status_code == 200
    assert data.get("answer") == "ESCALATE"
    assert data.get("status") == "not_in_syllabus"
    print("Escalation guard passed.")

def test_triage():
    print("\n--- 3. Testing POST /triage (Emergency exam study plan) ---")
    payload = {
        "subject": "Introduction to Psychology",
        "hours_left": 3,
        "weak_topics": ["memory", "conditioning", "behaviorism"]
    }
    res = requests.post(f"{BASE_URL}/triage", json=payload)
    print("Status:", res.status_code)
    data = res.json()
    print("Response:", data)
    assert res.status_code == 200
    assert data.get("status") == "success"
    plan = data.get("study_plan", {})
    assert "high_yield_core" in plan
    assert "quick_wins" in plan
    assert "skip_list" in plan
    print("Emergency triage passed.")

if __name__ == "__main__":
    if not wait_for_server():
        sys.exit(1)
    test_upload_pdf()
    test_upload_invalid_file()
    test_ask_socratic_in_scope()
    test_ask_socratic_escalation()
    test_triage()
    print("\n=== ALL CLASSCONNECT ENDPOINT TESTS PASSED SUCCESSFULLY ===")
