"""All timestamps in BookBase are timezone-aware UTC, stored as ISO-8601 strings."""
import datetime


def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()
