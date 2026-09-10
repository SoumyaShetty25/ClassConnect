import requests
import sys
import os

BASE_URL = "http://localhost:8000"

def print_banner():
    print("=" * 60)
    print("       Academic AI -- RAG Terminal Assistant")
    print("=" * 60)

def ingest_file(file_path: str):
    if not os.path.exists(file_path):
        print(f"\n[!] Error: File '{file_path}' does not exist.")
        return False
    
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".txt", ".pdf", ".docx"]:
        print(f"\n[!] Error: Only .txt, .pdf, and .docx files are supported (got '{ext}').")
        return False
    
    if ext == ".pdf":
        mime = "application/pdf"
    elif ext == ".docx":
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        mime = "text/plain"
    filename = os.path.basename(file_path)
    
    print(f"\n[*] Uploading and indexing '{filename}'...")
    try:
        with open(file_path, "rb") as f:
            files = {"file": (filename, f, mime)}
            res = requests.post(f"{BASE_URL}/ingest", files=files, timeout=60)
            
        if res.status_code == 200:
            data = res.json()
            print(f"[+] Success: Loaded {data.get('chunks_loaded', 0)} chunks from '{filename}'.")
            return True
        else:
            print(f"[!] Ingestion failed ({res.status_code}): {res.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("\n[!] Error: Cannot connect to backend server at http://localhost:8000.")
        print("    Make sure the server is running with: python main.py")
        return False

def ask_question(query: str):
    if not query.strip():
        return
    
    print(f"\n[*] Searching notes for: \"{query}\"...")
    try:
        res = requests.post(f"{BASE_URL}/ask", json={"query": query}, timeout=60)
        if res.status_code != 200:
            print(f"[!] Request failed ({res.status_code}): {res.text}")
            return
        
        data = res.json()
        status = data.get("status")
        
        if status == "answered":
            print("\n" + "=" * 60)
            print("ANSWER:")
            print("=" * 60)
            print(data.get("answer"))
            print("=" * 60)
            citations = data.get("citations", [])
            if citations:
                print(f"Sources Cited: {', '.join(citations)}")
            print("=" * 60 + "\n")
            
        elif status == "escalated_to_teacher":
            print("\n" + "=" * 60)
            print("STATUS: ESCALATED TO TEACHER")
            print("=" * 60)
            print(f"Reason: {data.get('reason', 'Context incomplete')}")
            citations = data.get("citations", [])
            if citations:
                print(f"Related Files: {', '.join(citations)}")
            print("=" * 60 + "\n")
            
        else:
            print(f"\nResponse: {data}\n")
            
    except requests.exceptions.ConnectionError:
        print("\n[!] Error: Cannot connect to backend server at http://localhost:8000.")
        print("    Make sure the server is running with: python main.py")

def interactive_mode():
    print_banner()
    print("Commands:")
    print("  /upload <path>   Upload and index a .txt, .pdf, or .docx file")
    print("  /exit            Quit the program")
    print("  Or simply type any question to ask your notes!\n")
    
    while True:
        try:
            user_input = input("AcademicAI > ").strip()
            if not user_input:
                continue
            
            if user_input.lower() in ["/exit", "exit", "quit", ":q"]:
                print("\nGoodbye!\n")
                break
            
            if user_input.lower().startswith("/upload "):
                file_path = user_input[8:].strip().strip('"').strip("'")
                ingest_file(file_path)
            elif user_input.lower() == "/upload":
                path = input("Enter path to .txt, .pdf, or .docx file: ").strip().strip('"').strip("'")
                ingest_file(path)
            else:
                ask_question(user_input)
                
        except (KeyboardInterrupt, EOFError):
            print("\n\nGoodbye!\n")
            break

if __name__ == "__main__":
    # If arguments are passed:
    #   python cli.py ingest <filepath>
    #   python cli.py ask "Your question"
    args = sys.argv[1:]
    if len(args) >= 2 and args[0].lower() in ["ingest", "upload"]:
        ingest_file(args[1])
    elif len(args) >= 2 and args[0].lower() == "ask":
        ask_question(" ".join(args[1:]))
    elif len(args) == 1 and args[0].lower() in ["--help", "-h", "help"]:
        print("Usage:")
        print("  python cli.py                       # Launch interactive terminal mode")
        print("  python cli.py ingest <filepath>     # Upload and index a .txt, .pdf, or .docx")
        print("  python cli.py ask \"<question>\"      # Query notes and get answer")
    else:
        interactive_mode()
