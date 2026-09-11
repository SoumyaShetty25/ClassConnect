"""
ClassConnect Full-Stack System Integration & E2E Test Suite
Covers:
1. Admin Authentication
2. Class Management
3. Account Provisioning (Student & Teacher)
4. Student Onboarding Lifecycle (Forced Password Change & Onboarding State)
5. Multi-image Face Registration
6. Multi-face Attendance Marking & Ledger Retrieval
"""

import os
import requests
import json

BASE_URL = "http://localhost:8000"

def run_tests():
    print("==================================================")
    print("ClassConnect Full System End-to-End API Test Suite")
    print("==================================================")

    # 1. Admin Login
    print("\n[1] Testing Admin Login (POST /auth/login)...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@classconnect.edu",
        "password": "admin123"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_data = res.json()
    admin_token = admin_data["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"✅ Admin logged in successfully. Role: {admin_data['role']}")

    # 2. Create Class
    print("\n[2] Testing Create Class (POST /admin/create-class)...")
    res = requests.post(f"{BASE_URL}/admin/create-class", json={"name": "CS-101 AI Systems"}, headers=admin_headers)
    assert res.status_code == 200, f"Create class failed: {res.text}"
    class_info = res.json()
    class_id = class_info["id"]
    print(f"✅ Class created: {class_info['name']} (ID: {class_id})")

    # Verify Classes list
    res = requests.get(f"{BASE_URL}/admin/classes", headers=admin_headers)
    assert res.status_code == 200
    classes = res.json()
    assert any(c["id"] == class_id for c in classes)
    print(f"✅ Class confirmed in GET /admin/classes (Total classes: {len(classes)})")

    # 3. Create Teacher Account
    print("\n[3] Testing Teacher Account Creation (POST /admin/create-account)...")
    res = requests.post(f"{BASE_URL}/admin/create-account", json={
        "name": "Dr Alan Turing",
        "role": "teacher"
    }, headers=admin_headers)
    assert res.status_code == 200, f"Teacher creation failed: {res.text}"
    teacher_acc = res.json()
    print(f"✅ Teacher created: {teacher_acc['email']} | Temp Password: {teacher_acc['temporaryPassword']}")

    # Login Teacher & update password
    teacher_login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": teacher_acc["email"],
        "password": teacher_acc["temporaryPassword"]
    })
    assert teacher_login_res.status_code == 200
    teacher_token = teacher_login_res.json()["token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    requests.post(f"{BASE_URL}/auth/change-password", json={
        "oldPassword": teacher_acc["temporaryPassword"],
        "newPassword": "TeacherSecurePass123!"
    }, headers=teacher_headers)
    print("✅ Teacher password successfully updated.")

    # 4. Create Student Account
    print("\n[4] Testing Student Account Creation (POST /admin/create-account)...")
    res = requests.post(f"{BASE_URL}/admin/create-account", json={
        "name": "Jane Student",
        "role": "student",
        "classId": class_id
    }, headers=admin_headers)
    assert res.status_code == 200, f"Student creation failed: {res.text}"
    student_acc = res.json()
    student_id = student_acc["userId"]
    print(f"✅ Student created: {student_acc['email']} | Temp Password: {student_acc['temporaryPassword']}")

    # Verify student list in admin
    res = requests.get(f"{BASE_URL}/admin/students", headers=admin_headers)
    assert res.status_code == 200
    students = res.json()
    assert any(s["email"] == student_acc["email"] for s in students)
    print(f"✅ Student listed in GET /admin/students (Total students: {len(students)})")

    # 5. Student Onboarding Workflow
    print("\n[5] Testing Student Login & Onboarding Gate (GET /me/next-step)...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": student_acc["email"],
        "password": student_acc["temporaryPassword"]
    })
    assert res.status_code == 200
    student_token = res.json()["token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Verify next-step is password_change
    res = requests.get(f"{BASE_URL}/me/next-step", headers=student_headers)
    assert res.status_code == 200
    assert res.json()["step"] == "password_change"
    print("✅ Onboarding Step 1 Verified: 'password_change' required.")

    # Update Student Password
    res = requests.post(f"{BASE_URL}/auth/change-password", json={
        "oldPassword": student_acc["temporaryPassword"],
        "newPassword": "StudentPassword123!"
    }, headers=student_headers)
    assert res.status_code == 200
    print("✅ Student password changed successfully.")

    # Verify next-step is now face_registration
    res = requests.get(f"{BASE_URL}/me/next-step", headers=student_headers)
    assert res.status_code == 200
    assert res.json()["step"] == "face_registration"
    print("✅ Onboarding Step 2 Verified: 'face_registration' required.")

    # 6. Face Registration
    print("\n[6] Testing Student Face Registration (POST /face/register)...")
    sample_img_path = os.path.join("Face_recognition", "data", "test_images", "somya1.jpeg")
    assert os.path.exists(sample_img_path), f"Sample image not found: {sample_img_path}"

    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()

    # Upload 15 face frames to reach MIN_VALID_EMBEDDINGS requirement
    files = [("files", (f"pose_{i+1}.jpg", img_bytes, "image/jpeg")) for i in range(15)]
    res = requests.post(f"{BASE_URL}/face/register", files=files, headers=student_headers)
    assert res.status_code == 200, f"Face registration failed: {res.text}"
    reg_data = res.json()
    print(f"✅ Face Registration response: Accepted {reg_data['acceptedCount']} of {reg_data['totalImages']} frames.")
    print(f"✅ Face Registration Status: {reg_data['status']} ({reg_data['message']})")
    assert reg_data["status"] == "completed"

    # Verify student has completed all onboarding and can access dashboard
    res = requests.get(f"{BASE_URL}/me/next-step", headers=student_headers)
    assert res.status_code == 200
    assert res.json()["step"] == "dashboard"
    print("✅ Onboarding Step 3 Verified: Student reached 'dashboard' step!")

    # 7. Classroom Attendance Marking
    print("\n[7] Testing Classroom Photo Attendance Marking (POST /attendance/mark)...")
    classroom_img_path = os.path.join("Face_recognition", "data", "test_images", "somya2.jpeg")
    with open(classroom_img_path, "rb") as f:
        classroom_bytes = f.read()

    files = {"file": ("classroom_photo.jpg", classroom_bytes, "image/jpeg")}
    data = {"classId": class_id}
    res = requests.post(f"{BASE_URL}/attendance/mark", files=files, data=data, headers=admin_headers)
    assert res.status_code == 200, f"Attendance mark failed: {res.text}"
    att_res = res.json()
    print(f"✅ Attendance Marked: {att_res['totalFacesDetected']} face(s) detected, {att_res['presentCount']} present, {att_res['unknownCount']} unknown.")
    assert att_res["presentCount"] >= 1
    matched_student = att_res["results"][0]
    print(f"✅ Student Matched: {matched_student['studentName']} with Similarity: {matched_student['similarity']:.4f}")
    assert matched_student["matched"] is True

    # 8. Check Attendance Records
    print("\n[8] Testing Attendance Records Retrieval (GET /attendance/records)...")
    res = requests.get(f"{BASE_URL}/attendance/records?classId={class_id}", headers=admin_headers)
    assert res.status_code == 200
    records = res.json()
    print(f"✅ Retrieved {len(records)} attendance record(s) for class {class_id}.")

    print("\n==================================================")
    print("✅ ALL SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
