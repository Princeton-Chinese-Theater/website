"""Explicit online import. Credentials are read from hidden stdin, never files.

Run from the project root after deploying with temporary ARCHIVE_IMPORT_TOKEN.
Input JSON: url, serviceToken (Sites access), importToken (maintenance access).
Remove the runtime import secret and redeploy after a successful import.
"""
import getpass
import json
import sqlite3
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def main():
    config = json.loads(getpass.getpass("Online import credentials JSON (hidden): "))
    origin = config["url"].rstrip("/")
    if origin != "https://pct-production-template.hackprinceto-1505.chatgpt.site":
        raise ValueError("Unexpected destination; check the selected Site")
    source = json.loads(Path("data/curated-archive.json").read_text())
    ids = {p["id"] for p in source["productions"]}
    with sqlite3.connect("file:.local-data/productions.sqlite?mode=ro", uri=True) as db:
        records = [{"production": json.loads(data), "publicationStatus": status}
                   for record_id, data, status in db.execute("SELECT id,data,publication_status FROM productions ORDER BY id")
                   if record_id in ids]
    if len(records) != len(ids):
        raise ValueError("Local database is missing curated records")

    def request(path, body=None, method=None):
        headers = {"OAI-Sites-Authorization": "Bearer " + config["serviceToken"]}
        if body is not None:
            headers.update({"Content-Type": "application/json", "x-archive-import-token": config["importToken"]})
        for attempt in range(3):
            req = urllib.request.Request(origin + path, headers=headers,
                                         data=json.dumps(body, ensure_ascii=False).encode() if body is not None else None,
                                         method=method)
            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    return response.status, response.headers, response.read()
            except urllib.error.HTTPError as error:
                if error.code < 500 or attempt == 2:
                    return error.code, error.headers, error.read()
            except urllib.error.URLError:
                if attempt == 2:
                    raise
            time.sleep(attempt + 1)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path(".local-data/online-import-backups") / stamp
    backup.mkdir(parents=True, exist_ok=False)
    (backup / "source.json").write_text(json.dumps(records, ensure_ascii=False, indent=2))
    status, _, raw = request("/api/productions")
    if status != 200:
        raise RuntimeError(f"Cannot read destination: HTTP {status}")
    (backup / "before-published.json").write_bytes(raw)
    excluded_photos = []
    for record in records:
        production = record["production"]
        for photo in production.get("photos", [])[:]:
            path = photo["url"]
            if path.startswith("/assets/") and not (Path("public") / path.lstrip("/")).is_file():
                excluded_photos.append({"id": production["id"], "photo": photo})
                production["photos"].remove(photo)
                print(f"Excluded missing optional photo: {production['id']} {path}", flush=True)
    (backup / "excluded-photos.json").write_text(json.dumps(excluded_photos, ensure_ascii=False, indent=2))
    assets = set()
    for record in records:
        p = record["production"]
        links = [p.get("poster", ""), p.get("playbillUrl", "")]
        links.extend(photo["url"] for photo in p.get("photos", []))
        assets.update(url for url in links if url.startswith("/assets/"))
    for path in sorted(assets):
        if not (Path("public") / path.lstrip("/")).is_file():
            raise RuntimeError(f"Missing local asset: {path}")
        status, _, _ = request(path, method="HEAD")
        if status != 200:
            raise RuntimeError(f"Missing online asset: {path} (HTTP {status})")
    print(f"Verified {len(assets)} online assets", flush=True)

    results = []
    for body in records:
        status, _, raw = request("/api/archive-import", body)
        if status != 200:
            raise RuntimeError(f"Import failed for {body['production']['id']}: HTTP {status}")
        result = json.loads(raw)
        results.append(result)
        (backup / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
        if result["inserted"] and (result["record"]["production"] != body["production"] or result["record"]["publicationStatus"] != body["publicationStatus"]):
            raise RuntimeError("Imported record differs from source")
        print(f"{'Imported' if result['inserted'] else 'Preserved existing'} {body['production']['id']} ({result['record']['publicationStatus']})", flush=True)

    status, _, raw = request("/api/productions")
    if status != 200:
        raise RuntimeError("Cannot verify published archive")
    published = {r["production"]["id"]: r for r in json.loads(raw)["records"]}
    for result in results:
        record = result["record"]
        p = record["production"]
        if record["publicationStatus"] == "published":
            if published.get(p["id"]) != record:
                raise RuntimeError(f"Public record mismatch: {p['id']}")
        else:
            status, _, _ = request("/api/productions/" + p["id"])
            if p["id"] in published or status != 404:
                raise RuntimeError(f"Draft visibility failure: {p['id']}")
    summary = {"imported": sum(r["inserted"] for r in results),
               "preserved": sum(not r["inserted"] for r in results),
               "published": sum(r["record"]["publicationStatus"] == "published" for r in results),
               "draft": sum(r["record"]["publicationStatus"] == "draft" for r in results),
               "verifiedAssets": len(assets), "excludedPhotos": len(excluded_photos), "backup": str(backup)}
    (backup / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary), flush=True)


if __name__ == "__main__":
    main()
