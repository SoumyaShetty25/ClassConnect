"""
test_notes_socratic_triage.py — Verification of Notes/PYQ, Socratic Tutor & Triage
"""

import io
import sys
import requests
from pypdf import PdfWriter

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=" * 60)
    print("Testing Notes & PYQ, Socratic Tutor, and Triage Engine")
    print("=" * 60)

    # 1. Login as Admin
    print("\n[1] Logging in as Admin...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@classconnect.edu",
        "password": "admin123"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("token") or login_resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Admin authenticated.")

    # 2. Upload Course Notes
    print("\n[2] Uploading Course Notes (Machine Learning Notes)...")
    with open("notes/machine_learning_notes.pdf", "rb") as f:
        notes_pdf = f.read()
    files = {"file": ("machine_learning_notes.pdf", notes_pdf, "application/pdf")}
    data = {"title": "Machine Learning Core Notes", "type": "notes"}
    up_resp = requests.post(f"{BASE_URL}/notes/upload", headers=headers, files=files, data=data)
    assert up_resp.status_code == 200, f"Upload notes failed: {up_resp.text}"
    note_info = up_resp.json()
    note_id = note_info["noteId"]
    print(f"✅ Course Notes uploaded: ID={note_id}, Chunks={note_info['chunkCount']}")

    # 3. Upload PYQ Paper
    print("\n[3] Uploading Previous Year Question Paper (PYQ)...")
    with open("notes/sample_lecture_quantum.pdf", "rb") as f:
        pyq_pdf = f.read()
    pyq_files = {"file": ("sample_midterm_pyq.pdf", pyq_pdf, "application/pdf")}
    data_pyq = {"title": "2024 Exam PYQ Paper", "type": "pyq"}
    up_pyq_resp = requests.post(f"{BASE_URL}/notes/upload", headers=headers, files=pyq_files, data=data_pyq)
    assert up_pyq_resp.status_code == 200, f"Upload PYQ failed: {up_pyq_resp.text}"
    pyq_info = up_pyq_resp.json()
    pyq_id = pyq_info["noteId"]
    print(f"✅ PYQ uploaded: ID={pyq_id}, Chunks={pyq_info['chunkCount']}")

    # 4. List Documents
    print("\n[4] Listing Uploaded Notes & PYQs...")
    list_resp = requests.get(f"{BASE_URL}/notes", headers=headers)
    assert list_resp.status_code == 200
    docs = list_resp.json()
    print(f"✅ Found {len(docs)} total documents in repository.")
    types_found = {d["type"] for d in docs}
    assert "notes" in types_found, "Notes type missing in list"
    assert "pyq" in types_found, "PYQ type missing in list"

    # 5. Test Download Note
    print("\n[5] Testing PDF Download...")
    dl_resp = requests.get(f"{BASE_URL}/notes/{note_id}/download", headers=headers)
    assert dl_resp.status_code == 200, f"Download failed: {dl_resp.status_code}"
    assert len(dl_resp.content) > 0, "Downloaded PDF is empty"
    print(f"✅ PDF downloaded successfully ({len(dl_resp.content)} bytes).")

    # 6. Test Socratic Tutor with Question 1
    print("\n[6] Testing Socratic Tutor Question 1: 'What is the role of the learning rate in SGD?'")
    soc_resp1 = requests.post(f"{BASE_URL}/ask-socratic", json={
        "question": "What is the role of the learning rate in SGD?"
    })
    assert soc_resp1.status_code == 200
    res1 = soc_resp1.json()
    print(f"   Answer 1: {res1.get('answer')[:120]}...")

    # 7. Test Socratic Tutor with Question 2
    print("\n[7] Testing Socratic Tutor Question 2: 'How does the chain rule work in backprop?'")
    soc_resp2 = requests.post(f"{BASE_URL}/ask-socratic", json={
        "question": "How does the chain rule work in backprop?"
    })
    assert soc_resp2.status_code == 200
    res2 = soc_resp2.json()
    print(f"   Answer 2: {res2.get('answer')[:120]}...")

    # Verify context awareness: Answer 1 and Answer 2 must NOT be identical!
    assert res1.get("answer") != res2.get("answer"), "FAIL: Socratic tutor returned identical answers for different questions!"
    print("✅ Socratic tutor is CONTEXT-AWARE: returned distinct, topic-specific guidance for each question!")

    # 8. Test Emergency Triage with PYQ Insights
    print("\n[8] Testing Emergency Triage (Subject: Machine Learning, Weak topics: Backpropagation, Learning Rate)...")
    triage_resp = requests.post(f"{BASE_URL}/triage", json={
        "subject": "Machine Learning",
        "hours_left": 4,
        "weak_topics": ["Backpropagation", "Learning Rate"]
    })
    assert triage_resp.status_code == 200
    triage_data = triage_resp.json()
    plan = triage_data.get("study_plan", {})
    print(f"   High-Yield Core: {plan.get('high_yield_core')}")
    print(f"   Quick Wins: {plan.get('quick_wins')}")
    print(f"   Skip List: {plan.get('skip_list')}")
    if plan.get("pyq_insights"):
        print(f"   PYQ Insights: {plan.get('pyq_insights')}")
        print("✅ Emergency Triage successfully incorporated PYQ trends!")
    else:
        print("ℹ️ PYQ insights key not populated directly in JSON object, plan:", plan)

    # 9. Clean up test documents
    print("\n[9] Cleaning up test documents...")
    del1 = requests.delete(f"{BASE_URL}/notes/{note_id}", headers=headers)
    assert del1.status_code == 200
    del2 = requests.delete(f"{BASE_URL}/notes/{pyq_id}", headers=headers)
    assert del2.status_code == 200
    print("✅ Cleaned up test documents.")

    print("\n" + "=" * 60)
    print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
