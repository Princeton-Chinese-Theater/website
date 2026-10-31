"""Prepare reviewed research for the local website; never publishes anything."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
import re

SITE = Path(__file__).resolve().parents[1]
RESEARCH = SITE.parent / "research"
sys.path.insert(0, str(RESEARCH))
from people import format_name, missing_names
TARGET = SITE / "data/curated-archive.json"
BASELINE = SITE / ".local-data/archive-original.json"
BASELINE.parent.mkdir(parents=True, exist_ok=True)
if not BASELINE.exists():
    shutil.copyfile(SITE / "public/data/curated-archive.json", BASELINE)
original = {p["id"]: p for p in json.loads(BASELINE.read_text())["productions"]}
research = json.loads((RESEARCH / "productions.json").read_text())["productions"]
stories = json.loads((RESEARCH / 'story-synopses.json').read_text())['productions']
site_policy = json.loads((RESEARCH / 'site-policy.json').read_text())
verified_pct = set(site_policy['verified_pct_research_ids'])
aliases = {"2025-moses": "2025-fall-moses", "2026-rhino": "2026-spring-rhino", "2018-teahouse": "2018-fall-teahouse"}
draft_ids = {"pre2017-me", "pre2017-ruan", "pre2017-libai", "pre2017-love", "2016-amber", "pre2018-playhouse", "2018-bean", "2020-birdman-reading", "2026-sheming"}
creative_roles = {
    "original_playwright": "原作编剧", "original_author": "原作者", "original_work": "原作",
    "writer": "编剧", "writers": "编剧", "playwright": "编剧", "adapters": "改编", "adapter": "改编", "directors": "导演团队",
    "director": "导演", "codirector": "副导演 / 联合导演", "codirectors": "副导演 / 联合导演", "assistant_director": "助理导演",
    "artistic_director": "艺术导演", "director_performance": "表演导演", "director_production": "制作导演",
    "producer": "制作人", "music": "音乐创作", "music_director": "音乐总监",
    "english_adapter": "英文改编", "translator": "翻译",
}
crew_roles = {
    "stage_manager": "舞台监督", "stage_managers": "舞台统筹", "set_design": "舞台设计", "scenic_designer": "舞美设计",
    "lighting_design": "灯光设计", "lighting_operator": "灯光执行", "sound_design": "声音设计", "sound_effects": "音效",
    "sound_operator": "声音执行", "costume": "服装", "costume_design": "服装设计", "makeup": "妆造", "visual_design": "视觉设计",
    "set_and_prop": "布景与道具", "choreography": "舞蹈设计", "photography": "摄影", "translation_and_subtitles": "翻译与字幕",
    "stage_operation": "场务", "publicity": "宣传", "playbill": "节目册制作", "dance_ensemble": "黑衣舞团",
    "projection_design": "投影设计",
}


def credits(values, labels):
    return [{"role": label, "name": "、".join(values[key]) if isinstance(values[key], list) else values[key]}
            for key, label in labels.items() if values.get(key)]


def venue_display(value):
    if re.search(r'whitman|惠特曼', value, re.IGNORECASE):
        return site_policy['venue_display_names']['whitman']
    if re.search(r'\bfrist\b', value, re.IGNORECASE):
        return site_policy['venue_display_names']['frist']
    return value


assets = SITE / "public/assets/archive"
assets.mkdir(parents=True, exist_ok=True)
poster_sources = {
    "2021-anlian": (RESEARCH / "google-drive/playbills/2021-anlian-cover.jpg", "2021-anlian.jpg"),
    "2022-journey": (RESEARCH / "google-drive/playbills/2022-journey-cover.png", "2022-journey.png"),
    "2024-chess": (RESEARCH / "google-drive/posters/2024-chess-Caroline.png", "2024-chess.png"),
}
# The rasterized poster is retained in research for subsequent, offline rebuilds.
chess = RESEARCH / "google-drive/posters/2024-chess-Caroline.png"
if not chess.exists():
    subprocess.run(["sips", "-s", "format", "png", str(chess.with_suffix(".pdf")), "--out", str(chess)], check=True)
poster_sources["2024-chess"] = (chess, "2024-chess.png")
for source, name in poster_sources.values():
    shutil.copyfile(source, assets / name)

productions = []
statuses = {}
source_ids = {}
for row in research:
    source_id = row["id"]
    if source_id in site_policy.get('excluded_standalone_research_ids', {}):
        continue
    site_id = aliases.get(source_id, source_id)
    p = dict(original.get(site_id, {}))
    p.update({"id": site_id, "title": row["title"], "year": row.get('year') or (source_id[:4] if source_id[:4].isdigit() else ""),
              "season": row["period"], "status": row["status"], "updatedAt": "2026-10-31"})
    if row.get("english_title"):
        p["titleEn"] = row["english_title"]
    if row.get("venue"):
        p["venue"] = row["venue"]
    if p.get('venue'):
        p['venue'] = venue_display(p['venue'])
    p["performances"] = row.get('performances') or [row["period"]]
    if row.get('language'):
        p['language'] = row['language']
    # Public synopses describe the story; evidence and collection notes stay in research.
    story = stories.get(source_id, {})
    p["synopsis"] = story.get('zh', '') if story.get('verification') == 'source_checked' and story.get('evidence') else ''
    if row.get('director_note'):
        p['directorNote'] = row['director_note']
    c = row.get("credits", {})
    p["creative"] = credits(c, creative_roles) or p.get("creative", [])
    # Preserve every source role, including duties outside the small standard-role map.
    source_crew = [{"role": role, "name": name} for role, name in c.get('crew', [])]
    p["crew"] = (credits(c, crew_roles) + source_crew) or p.get("crew", [])
    p["cast"] = [{"role": role, "name": name} for role, name in c.get("cast", [])] or p.get("cast", [])
    for group in ['creative', 'cast', 'crew']:
        p[group] = [{**credit, 'name': format_name(credit['name'])} for credit in p[group]]
    if source_id in poster_sources:
        p["poster"] = "/assets/archive/" + poster_sources[source_id][1]
        p["posterAlt"] = row["title"] + "原始演出海报"
    if row.get('poster_local_path', '').startswith(('research/wechat/', 'research/legacy-site/', 'research/lewis-center/')):
        poster = SITE.parent / row['poster_local_path']
        name = source_id + poster.suffix
        shutil.copyfile(poster, assets / name)
        p['poster'] = '/assets/archive/' + name
        p['posterAlt'] = row.get('poster_alt') or row['title'] + ('旧版官网演出海报' if row['poster_local_path'].startswith('research/legacy-site/') else '公众号原始演出海报')
    if row.get('playbill_preview'):
        preview = row['playbill_preview']
        file = SITE.parent / preview['local_path']
        shutil.copyfile(file, assets / file.name)
        p['playbillUrl'] = '/assets/archive/' + file.name
        p['playbillLabel'] = preview['label']
    if row.get("playbills") and source_id != "2025-moses":
        b = row["playbills"][0]
        name = source_id + Path(b["local_path"]).suffix
        shutil.copyfile(SITE.parent / b["local_path"], assets / name)
        p["playbillUrl"] = "/assets/archive/" + name
        p["playbillLabel"] = "下载节目册（Word原文件）"
    if source_id == "2026-rhino":
        shutil.copyfile(RESEARCH / "google-drive/playbills/2026-rhino-playbill-notes.pdf", assets / "2026-rhino-playbill-notes.pdf")
        p["playbillUrl"] = "/assets/archive/2026-rhino-playbill-notes.pdf"
        p["playbillLabel"] = "查看节目册资料（整理稿）"
    evidence = {s["url"]: s["title"] for s in row.get("drive_evidence", [])}
    sources = {s["url"]: s["label"] for s in p.get("sources", [])}
    for url in row.get("source_urls", []):
        sources.setdefault(url, evidence.get(url, "旧版官网资料" if 'princeton.edu/~ctheatre/' in url else "原始资料"))
    sources.update(row.get('source_labels', {}))
    p["sources"] = [{"url": url, "label": label} for url, label in sources.items()]
    productions.append(p)
    statuses[site_id] = row.get('publication_status') or ("draft" if source_id in draft_ids else "published")
    if source_id not in verified_pct:
        statuses[site_id] = 'draft'
    source_ids[site_id] = source_id

# Put the latest productions first without changing the established IDs of links.
productions.sort(key=lambda p: (p.get("year", ""), p["id"]), reverse=True)
TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(json.dumps({"productions": productions, "publicationStatusById": statuses, "researchIdBySiteId": source_ids}, ensure_ascii=False, indent=2) + "\n")
translations_path = SITE / 'data/translations.json'
translations = json.loads(translations_path.read_text())
for story in stories.values():
    translations[story['zh']] = story['en']
translations_path.write_text(json.dumps(translations, ensure_ascii=False, indent=2) + '\n')
# Only the reviewed, visible catalog belongs in public assets; draft records stay outside public/.
(SITE / "public/data/curated-archive.json").write_text(json.dumps({"productions": [p for p in productions if statuses[p["id"]] == "published"]}, ensure_ascii=False, indent=2) + "\n")
print(f"Prepared {len(productions)} records: {sum(s == 'published' for s in statuses.values())} visible locally, {sum(s == 'draft' for s in statuses.values())} research drafts.")
plan_path = RESEARCH / 'google-drive/collection-plan.json'
if plan_path.exists():
    plan = json.loads(plan_path.read_text())
    plan['local_website'].update({'records': len(productions),
        'visible': sum(s == 'published' for s in statuses.values()),
        'drafts': sum(s == 'draft' for s in statuses.values()),
        'posters': sum(bool(p.get('poster')) for p in productions),
        'playbill_or_notes_links': sum(bool(p.get('playbillUrl')) for p in productions)})
    plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n')
missing = []
for p in productions:
    for group in ['creative', 'cast', 'crew']:
        for credit in p.get(group, []):
            if credit['role'] == '原作':
                continue
            for name in missing_names(credit['name']):
                missing.append({'production_id': p['id'], 'group': group, 'role': credit['role'], 'name': name})
(RESEARCH / 'people-missing.json').write_text(json.dumps(missing, ensure_ascii=False, indent=2) + '\n')
