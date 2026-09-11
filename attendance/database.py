"""
attendance/database.py — MongoDB connection and collection accessors.

Uses Motor (async MongoDB driver) for non-blocking I/O with FastAPI.
Connection is established once at startup via the lifespan event.
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level state
# ---------------------------------------------------------------------------

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None

DB_NAME = "classconnect"


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

async def _safe_create_unique_index(collection, field: str) -> None:
    """
    Create a unique index on *field*, handling conflicts.
    If a non-unique index with the same name already exists, drop it first.
    """
    from pymongo.errors import OperationFailure
    try:
        await collection.create_index(field, unique=True)
    except OperationFailure as e:
        if e.code == 86:  # IndexKeySpecsConflict
            index_name = f"{field}_1"
            logger.warning("Dropping conflicting index '%s' on %s", index_name, collection.name)
            await collection.drop_index(index_name)
            await collection.create_index(field, unique=True)
        else:
            raise

async def connect_db() -> None:
    """Open the MongoDB connection and create indexes. Call once at startup."""
    global _client, _db

    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    logger.info("Connecting to MongoDB at %s …", uri)

    _client = AsyncIOMotorClient(uri)
    _db = _client[DB_NAME]

    # Unique indexes — handle conflicts with pre-existing non-unique indexes
    await _safe_create_unique_index(_db.users, "email")
    await _safe_create_unique_index(_db.studentProfiles, "rollNumber")
    await _safe_create_unique_index(_db.studentProfiles, "userId")
    await _safe_create_unique_index(_db.teacherProfiles, "userId")
    await _safe_create_unique_index(_db.faceEmbeddings, "studentId")
    await _db.attendanceRecords.create_index([("classId", 1), ("date", -1)])

    logger.info("MongoDB connected. Database: %s", DB_NAME)


async def close_db() -> None:
    """Close the MongoDB connection. Call once at shutdown."""
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed.")


# ---------------------------------------------------------------------------
# Accessors
# ---------------------------------------------------------------------------

def get_db() -> AsyncIOMotorDatabase:
    """Return the database instance. Raises if not connected."""
    if _db is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _db
