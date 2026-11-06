import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE_URL = "http://127.0.0.1:5000"


def call(path, payload=None, method=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method=method or ("POST" if data else "GET"),
    )
    try:
        with urlopen(request, timeout=45) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        return error.code, json.loads(body) if body else {}
    except URLError as error:
        raise SystemExit(f"Cannot reach the backend at {BASE_URL}: {error.reason}")


def main():
    checks = []

    checks.append(("health",) + call("/health"))

    checks.append(
        (
            "outbreak-alert",
        )
        + call("/outbreak-alert", {"lat": 12.97, "lon": 77.59, "language": "English"})
    )

    checks.append(
        (
            "outbreak-alert-missing-location",
        )
        + call("/outbreak-alert", {})
    )

    checks.append(
        (
            "chat",
        )
        + call("/chat", {"message": "I have high fever and body pain", "language": "English"})
    )

    checks.append(("chat-empty",) + call("/chat", {}))

    expected_status = {
        "health": 200,
        "outbreak-alert": 200,
        "outbreak-alert-missing-location": 400,
        "chat": 200,
        "chat-empty": 400,
    }

    failed = False
    for name, status, body in checks:
        is_last = name in ("chat", "chat-empty")
        ok = status == expected_status[name]
        if name == "health" and body.get("status") != "ok":
            ok = False
        if name in ("outbreak-alert", "outbreak-alert-missing-location") and not body.get("level"):
            ok = False
        if is_last and not body.get("reply"):
            ok = False

        print(f"[{'PASS' if ok else 'FAIL'}] {name}: HTTP {status}")
        if not ok:
            failed = True
            print(f"       response: {json.dumps(body, ensure_ascii=False)}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
