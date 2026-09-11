import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def check():
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)
    db = client["classconnect"]
    try:
        users = await db.users.find({}, {"email": 1, "role": 1, "createdAt": 1}).to_list(20)
        print("FOUND USERS:", len(users))
        for u in users:
            print(f" - Email: {u.get('email')}, Role: {u.get('role')}, ID: {u.get('_id')}")
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(check())
