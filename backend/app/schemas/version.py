from pydantic import BaseModel


class LatestRelease(BaseModel):
    version: str
    url: str
