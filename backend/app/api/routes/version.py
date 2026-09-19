from fastapi import APIRouter

from app.schemas.version import LatestRelease
from app.services import version_check

router = APIRouter(prefix="/version", tags=["version"])


@router.get("/latest-release", response_model=LatestRelease | None)
def latest_release():
    result = version_check.get_latest_release()
    return LatestRelease(**result) if result else None
