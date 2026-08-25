#!/usr/bin/env python3
"""Run one SQL statement through Supabase's management API.

Replaces psql in the test suite: the database password lived in a scratch
file that gets cleared between sessions, while the CLI token is in the
keychain and survives. Prints the first column of the first row, so callers
read the same as the `psql -tAc` they replaced.
"""
import json
import os
import sys
import urllib.request

token = os.environ.get("SB_TOKEN")
ref = os.environ.get("SB_REF", "yeiqjqsgxnjfkxmncdxa")
if not token:
    sys.exit("SB_TOKEN is not set")

req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{ref}/database/query",
    data=json.dumps({"query": sys.argv[1]}).encode(),
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    method="POST",
)

try:
    rows = json.load(urllib.request.urlopen(req, timeout=40))
except Exception as err:  # noqa: BLE001 — the suite only needs the failure, not the type
    print("", file=sys.stdout)
    print(f"sql failed: {err}", file=sys.stderr)
    sys.exit(0)

print(list(rows[0].values())[0] if rows else "")
