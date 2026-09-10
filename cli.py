"""
ClassConnect CLI — Terminal Academic Assistant
Interactive terminal interface for the ClassConnect Academic Intelligence API.
Supports:
  - PDF document ingestion (/upload)
  - Socratic tutor Q&A (/ask-socratic)
  - Emergency exam triage (/triage)
"""

import requests
import json
import sys
import os

BASE_URL = "http://localhost:8000"

def print_banner():
    print("=" * 65)
    print("       ClassConnect -- Academic Intelligence Terminal")
    print("=" * 65)

def upload_pdf(file_path: str):
    if not os.path.exists(file_path):
        print(f"\n[!] Error: File '{file_path}' does not exist.")
        return False
    
    if not file_path.lower().endswith(".pdf"):
        print(f"\n[!] Error: ClassConnect accepts PDF files only.")
        return False
    
    filename = os.path.basename(file_path)
    print(f"\n[*] Uploading and indexing '{filename}'...")
    try:
        with open(file_path, "rb") as f:
            files = {"file": (filename, f, "application/pdf")}
            res = requests.post(f"{BASE_URL}/upload", files=files, timeout=60)
            
        if res.status_code == 200:
            data = res.json()
            print(f"[+] Success: {data.get('message')}")
            return True
        else:
            print(f"[!] Upload failed ({res.status_code}): {res.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("\n[!] Error: Cannot connect to ClassConnect server at http://localhost:8000.")
        print("    Ensure the server is running with: python main.py")
        return False

def ask_socratic(question: str):
    if not question.strip():
        return
    
    print(f"\n[*] Asking Socratic Tutor: \"{question}\"...")
    try:
        res = requests.post(f"{BASE_URL}/ask-socratic", json={"question": question}, timeout=60)
        if res.status_code != 200:
            print(f"[!] Request failed ({res.status_code}): {res.text}")
            return
        
        data = res.json()
        status = data.get("status")
        
        if status == "success":
            print("\n" + "=" * 65)
            print("SOCRATIC TUTOR GUIDANCE:")
            print("=" * 65)
            print(data.get("answer"))
            print("=" * 65)
            sources = data.get("sources", [])
            if sources:
                print("\nContext Excerpts:")
                for i, src in enumerate(sources, 1):
                    print(f"  [{i}] {src.strip()}")
            print("=" * 65 + "\n")
            
        elif status == "not_in_syllabus" or data.get("answer") == "ESCALATE":
            print("\n" + "=" * 65)
            print("STATUS: NOT IN SYLLABUS (ESCALATE)")
            print("=" * 65)
            print("This topic is not covered in your uploaded course notes.")
            print("Escalating to instructor / syllabus materials.")
            print("=" * 65 + "\n")
        else:
            print(f"\nResponse: {data}\n")
            
    except requests.exceptions.ConnectionError:
        print("\n[!] Error: Cannot connect to ClassConnect server at http://localhost:8000.")
        print("    Ensure the server is running with: python main.py")

def run_triage(subject: str, hours_left: int, weak_topics: list[str]):
    print(f"\n[*] Running Emergency Exam Triage for '{subject}' ({hours_left}h left)...")
    try:
        payload = {
            "subject": subject,
            "hours_left": hours_left,
            "weak_topics": weak_topics
        }
        res = requests.post(f"{BASE_URL}/triage", json=payload, timeout=60)
        if res.status_code != 200:
            print(f"[!] Triage failed ({res.status_code}): {res.text}")
            return
        
        data = res.json()
        plan = data.get("study_plan", {})
        
        print("\n" + "=" * 65)
        print(f"EMERGENCY TRIAGE PLAN -- {subject.upper()} ({hours_left} HOURS LEFT)")
        print("=" * 65)
        
        print("\n[1] HIGH YIELD CORE (Spend 70% of your time here):")
        for item in plan.get("high_yield_core", []):
            print(f"  * {item}")
            
        print("\n[2] QUICK WINS (Definitions and easy points):")
        for item in plan.get("quick_wins", []):
            print(f"  + {item}")
            
        print("\n[3] SKIP LIST (Low priority - omit to save time):")
        for item in plan.get("skip_list", []):
            print(f"  - {item}")
            
        print("=" * 65 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n[!] Error: Cannot connect to ClassConnect server at http://localhost:8000.")
        print("    Ensure the server is running with: python main.py")

def interactive_mode():
    print_banner()
    print("Commands:")
    print("  /upload <path.pdf>         Upload PDF lecture notes or syllabus")
    print("  /triage                    Launch emergency exam triage generator")
    print("  /exit                      Quit")
    print("  Or simply type a question to get Socratic tutoring!\n")
    
    while True:
        try:
            user_input = input("ClassConnect > ").strip()
            if not user_input:
                continue
            
            if user_input.lower() in ["/exit", "exit", "quit", ":q"]:
                print("\nGoodbye!\n")
                break
            
            if user_input.lower().startswith("/upload "):
                file_path = user_input[8:].strip().strip('"').strip("'")
                upload_pdf(file_path)
            elif user_input.lower() == "/upload":
                path = input("Enter path to PDF file: ").strip().strip('"').strip("'")
                upload_pdf(path)
            elif user_input.lower() == "/triage":
                subj = input("Subject: ").strip()
                hrs = int(input("Hours left before exam: ").strip() or "4")
                topics_raw = input("Weak topics (comma-separated): ").strip()
                topics = [t.strip() for t in topics_raw.split(",") if t.strip()]
                run_triage(subj, hrs, topics)
            else:
                ask_socratic(user_input)
                
        except (KeyboardInterrupt, EOFError):
            print("\n\nGoodbye!\n")
            break

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) >= 2 and args[0].lower() == "upload":
        upload_pdf(args[1])
    elif len(args) >= 2 and args[0].lower() == "ask":
        ask_socratic(" ".join(args[1:]))
    elif len(args) >= 4 and args[0].lower() == "triage":
        # python cli.py triage "Psychology" 3 "memory,conditioning"
        run_triage(args[1], int(args[2]), [t.strip() for t in args[3].split(",")])
    elif len(args) == 1 and args[0].lower() in ["--help", "-h", "help"]:
        print("Usage:")
        print("  python cli.py                                        # Interactive mode")
        print("  python cli.py upload <file.pdf>                      # Upload PDF")
        print("  python cli.py ask \"<question>\"                       # Socratic question")
        print("  python cli.py triage <subject> <hours> <topics,...>  # Exam triage")
    else:
        interactive_mode()
