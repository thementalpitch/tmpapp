#!/usr/bin/env python3
"""Minimal Reddit OAuth API client using the stored custom.reddit credential.

Usage:
    reddit.py [METHOD] [PATH] [JSON_BODY]

JSON_BODY is converted to application/x-www-form-urlencoded, which is what
Reddit's write endpoints expect.

Examples:
    reddit.py GET /api/v1/me
    reddit.py GET /r/bootroom/about/rules
    reddit.py POST /api/comment '{"thing_id": "t3_xxxxx", "text": "..."}'

Auth: Bearer token attached from the custom.reddit connector via a surrogate.
Never prints or persists raw credentials.
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

API = "https://oauth.reddit.com"
# Reddit requires a unique, descriptive User-Agent. Update the username once known.
USER_AGENT = (
    "web:bob-for-the-mental-pitch:v1.0 "
    "(personal AI assistant acting only with the account owner's explicit approval)"
)


def main() -> None:
    method = sys.argv[1].upper() if len(sys.argv) > 1 else "GET"
    path = sys.argv[2] if len(sys.argv) > 2 else "/api/v1/me"
    data = None
    if len(sys.argv) > 3:
        body = json.loads(sys.argv[3])
        data = urllib.parse.urlencode(body).encode()

    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("User-Agent", USER_AGENT)
    req.add_header("Accept", "application/json")
    if data:
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    add_surrogate_to_request(req, "custom.reddit", allowed_hosts=["oauth.reddit.com"])

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = read_json_response(resp)
    except urllib.error.HTTPError as exc:
        try:
            err = exc.read().decode()[:2000]
        except Exception:
            err = "<unreadable>"
        print(f"HTTP {exc.code}: {err}", file=sys.stderr)
        sys.exit(2)
    print(json.dumps(result, indent=2)[:8000])


if __name__ == "__main__":
    main()
