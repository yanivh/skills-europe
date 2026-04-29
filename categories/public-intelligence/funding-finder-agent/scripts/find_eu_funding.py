#!/usr/bin/env python3
"""
Live discovery helper for EU grants and funding pages.

This script fetches official EU-level pages, extracts candidate links/titles,
filters out procurement-style entries, and scores basic profile fit.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import urllib.parse
import urllib.request
from html import unescape
from typing import Any


USER_AGENT = "funding-finder-agent/1.0 (+https://github.com/yanivh/skills-europe)"

SOURCES = [
    {
        "name": "Funding Portal Search",
        "url": "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-search",
        "kind": "grant",
    },
    {
        "name": "Horizon Europe Funding",
        "url": "https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe_en",
        "kind": "funding-program",
    },
    {
        "name": "Digital Europe Programme",
        "url": "https://digital-strategy.ec.europa.eu/en/activities/digital-programme",
        "kind": "funding-program",
    },
    {
        "name": "EIC Funding Opportunities",
        "url": "https://eic.ec.europa.eu/eic-funding-opportunities_en",
        "kind": "funding-program",
    },
    {
        "name": "EU LIFE Programme",
        "url": "https://cinea.ec.europa.eu/programmes/life_en",
        "kind": "grant",
    },
    {
        "name": "EU Mission Climate-Neutral Cities",
        "url": "https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe/eu-missions-horizon-europe/climate-neutral-and-smart-cities_en",
        "kind": "funding-program",
    },
    {
        "name": "Rothschild Foundation Hanadiv Europe",
        "url": "https://rothschildfoundation.eu/grants-page/",
        "kind": "grant",
    },
    {
        "name": "Rothschild Foundation Europe",
        "url": "https://rothschildfoundation.eu",
        "kind": "grant",
    },
    {
        "name": "European Union of Jewish Students",
        "url": "https://www.eujs.org/grants",
        "kind": "funding-program",
    },
]

FALLBACK_PROGRAMS = [
    {
        "programName": "EIC Accelerator",
        "programType": "grant",
        "fundingRange": "up to EUR 2.5M grant (blended options may apply)",
        "geography": "EU and associated countries",
        "sourceUrl": "https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en",
    },
    {
        "programName": "Horizon Europe EIC Pathfinder",
        "programType": "grant",
        "fundingRange": "varies by call topic",
        "geography": "EU and associated countries",
        "sourceUrl": "https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe/european-innovation-council-eic_en",
    },
    {
        "programName": "Digital Europe Programme Calls",
        "programType": "funding-program",
        "fundingRange": "varies by call topic",
        "geography": "EU and associated countries",
        "sourceUrl": "https://digital-strategy.ec.europa.eu/en/activities/digital-programme",
    },
    {
        "programName": "LIFE Programme Climate Action",
        "programType": "grant",
        "fundingRange": "varies by call topic",
        "geography": "EU and associated countries",
        "sourceUrl": "https://cinea.ec.europa.eu/programmes/life_en",
    },
    {
        "programName": "EU Mission Climate-Neutral and Smart Cities",
        "programType": "funding-program",
        "fundingRange": "varies by Horizon Europe mission calls",
        "geography": "EU",
        "sourceUrl": "https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe/eu-missions-horizon-europe/climate-neutral-and-smart-cities_en",
    },
    {
        "programName": "Rothschild Foundation Hanadiv Europe Grants",
        "programType": "grant",
        "fundingRange": "scoping and project grants (varies)",
        "geography": "Europe",
        "sourceUrl": "https://rothschildfoundation.eu/grants-page/",
    },
    {
        "programName": "Rothschild Collaborative Fellowships in Jewish Heritage",
        "programType": "grant",
        "fundingRange": "research fellowship support (varies)",
        "geography": "Europe",
        "sourceUrl": "https://rothschildfoundation.eu",
    },
    {
        "programName": "EUJS Embracing Jewish Diversity",
        "programType": "funding-program",
        "fundingRange": "community and inclusion program support (varies)",
        "geography": "Europe",
        "sourceUrl": "https://www.eujs.org/grants",
    },
]

PROCUREMENT_TERMS = {
    "tender",
    "procurement",
    "contract award",
    "contracting authority",
    "works contract",
}

FUNDING_TERMS = {
    "grant",
    "funding",
    "innovation",
    "call",
    "programme",
    "startup",
    "eic",
    "horizon",
    "digital europe",
    "non-dilutive",
}

SECTOR_HINTS = {
    "ai": {"ai", "artificial intelligence", "machine learning", "ml"},
    "healthtech": {"health", "medical", "biotech", "digital health"},
    "climate": {"climate", "green", "sustainability", "energy"},
    "govtech": {"public sector", "government", "civic", "administration"},
    "judaism": {"jewish", "judaism", "heritage", "synagogue", "community", "religious"},
}

PROGRAM_BONUS_HINTS = {
    "eic accelerator": {"startup", "sme", "innovation", "scaling", "deep tech"},
    "eic pathfinder": {"research", "breakthrough", "early-stage", "high-risk"},
    "digital europe": {"digital", "ai", "data", "cyber", "cloud"},
    "horizon": {"research", "innovation", "consortium", "r&d"},
    "life programme": {"climate", "environment", "nature", "clean energy", "adaptation"},
    "climate-neutral and smart cities": {"climate", "cities", "urban", "decarbonisation", "net zero"},
    "rothschild": {"jewish", "heritage", "archive", "museum", "collections", "fellowship"},
    "eujs": {"jewish", "student", "diversity", "inclusion", "community"},
}


def fetch_html(url: str, timeout: int = 18) -> str:
    req = urllib.request.Request(
        url=url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:  # noqa: S310
        raw = response.read()
    return raw.decode("utf-8", errors="replace")


def strip_tags(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract_anchor_candidates(html: str, base_url: str) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    anchor_re = re.compile(r"<a\b[^>]*href=['\"]([^'\"]+)['\"][^>]*>(.*?)</a>", re.I | re.S)
    for href, inner in anchor_re.findall(html):
        title = strip_tags(inner)
        if len(title) < 8:
            continue
        full_url = urllib.parse.urljoin(base_url, href)
        results.append({"title": title, "url": full_url})
    return results


def normalize_text_blob(html: str) -> str:
    return strip_tags(html).lower()


def extract_rothschild_details(html: str) -> dict[str, Any]:
    text = normalize_text_blob(html)
    grant_lines = []
    known_grants = [
        "Doctoral Fellowships",
        "Postdoctoral Fellowships",
        "Collaborative Fellowships in Jewish Heritage",
        "Departmental Initiative Grants",
        "Research Fellowship for Mid-Career Scholars",
        "Collections Management",
        "Exhibition Support",
        "Digital Heritage Projects",
        "Scoping Grant",
        "Expert/Consultant Visits",
    ]
    for grant_name in known_grants:
        if grant_name.lower() in text:
            grant_lines.append(grant_name)

    timeline = []
    if "applications for spring 2026 are closed" in text:
        timeline.append("Spring 2026 applications closed")
    if "final decisions will be sent in july 2026" in text:
        timeline.append("Final decisions in July 2026")
    if "autumn 2025" in text:
        timeline.append("Some calls mention Autumn 2025 rounds")

    return {
        "website": "Rothschild Foundation",
        "focusAreas": [
            "Academic Jewish Studies",
            "European Jewish Heritage",
            "Jewish Communal Life",
        ],
        "grantLines": grant_lines,
        "timelineSignals": timeline,
        "audience": "Institutions, scholars, and Jewish community organizations in Europe",
    }


def extract_eujs_details(html: str) -> dict[str, Any]:
    text = normalize_text_blob(html)
    program_lines = []
    known_programs = [
        "Embracing Jewish Diversity: 2025–2026 Eligible Initiatives",
        "Embracing Jewish Diversity - Call for Applications 2025/2026",
        "The Next Step 2025 - Grantees",
        "The Next Step 2025 - Apply for a EU Grant!",
    ]
    for program in known_programs:
        if program.lower() in text:
            program_lines.append(program)

    timeline = []
    if "2025–2026" in html or "2025/2026" in html:
        timeline.append("Active references to 2025-2026 grant rounds")
    if "november 4, 2025" in text:
        timeline.append("Relevant publication date: November 4, 2025")
    if "september 19, 2025" in text:
        timeline.append("Relevant publication date: September 19, 2025")

    return {
        "website": "EUJS Grants",
        "focusAreas": [
            "Jewish student initiatives",
            "Diversity and inclusion",
            "Community-led projects",
        ],
        "grantLines": program_lines,
        "timelineSignals": timeline,
        "audience": "Jewish student unions and community groups in Europe",
    }


def extract_source_grant_details(source_name: str, source_url: str, html: str) -> dict[str, Any]:
    if "rothschildfoundation.eu/grants-page/" in source_url or source_name.lower().startswith("rothschild"):
        return extract_rothschild_details(html)
    if "eujs.org/grants" in source_url or "jewish students" in source_name.lower():
        return extract_eujs_details(html)
    return {
        "website": source_name,
        "focusAreas": ["General innovation funding"],
        "grantLines": [],
        "timelineSignals": [],
        "audience": "See source details",
    }


def fallback_source_grant_details(source_name: str, source_url: str) -> dict[str, Any]:
    if "rothschildfoundation.eu/grants-page/" in source_url:
        return {
            "website": "Rothschild Foundation Grants Page",
            "focusAreas": [
                "Academic Jewish Studies",
                "European Jewish Heritage",
                "Jewish Communal Life",
            ],
            "grantLines": [
                "Collaborative Fellowships in Jewish Heritage",
                "Collections Management",
                "Exhibition Support",
                "Digital Heritage Projects",
                "Scoping Grant",
            ],
            "timelineSignals": [
                "Spring 2026 applications closed",
                "Final decisions expected in July 2026",
            ],
            "audience": "European universities, heritage institutions, and Jewish communal organizations",
        }
    if "eujs.org/grants" in source_url:
        return {
            "website": "EUJS Grants",
            "focusAreas": [
                "Jewish diversity",
                "Student and community initiatives",
                "Inclusion programming",
            ],
            "grantLines": [
                "Embracing Jewish Diversity 2025-2026",
                "The Next Step grant initiatives",
            ],
            "timelineSignals": [
                "Published grant rounds in 2025 and 2026 cycle",
            ],
            "audience": "Jewish student organizations and community groups in Europe",
        }
    return {
        "website": source_name,
        "focusAreas": ["General innovation funding"],
        "grantLines": [],
        "timelineSignals": [],
        "audience": "See source details",
    }


def appears_procurement(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in PROCUREMENT_TERMS)


def appears_funding(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in FUNDING_TERMS)


def keyword_overlap(text: str, query: str) -> int:
    words = {w for w in re.split(r"[^a-z0-9]+", text.lower()) if len(w) >= 3}
    query_words = {w for w in re.split(r"[^a-z0-9]+", query.lower()) if len(w) >= 3}
    return len(words.intersection(query_words))


def classify_and_score(item_text: str, question: str, stage: str, sector: str, trl: int | None) -> dict[str, Any]:
    fit_points = 0
    reasons: list[str] = []
    lower = item_text.lower()
    relevance = min(100, keyword_overlap(item_text, question) * 16)
    opportunity = 40
    risk = 60

    sector_norm = sector.strip().lower()
    sector_hints = SECTOR_HINTS.get(sector_norm, {sector_norm} if sector_norm else set())
    if sector_hints and any(hint in lower for hint in sector_hints):
        fit_points += 2
        relevance += 24
        opportunity += 20
        risk -= 12
        reasons.append("sector-specific signal found")

    if sector and sector.lower() in lower:
        fit_points += 2
        relevance += 20
        opportunity += 15
        risk -= 10
        reasons.append("sector keyword found")
    if "startup" in lower or "sme" in lower:
        fit_points += 1
        opportunity += 10
        risk -= 5
        reasons.append("startup/sme signal present")
    if stage and stage.lower() in lower:
        fit_points += 1
        relevance += 15
        risk -= 5
        reasons.append("stage-aligned wording")
    if trl is not None and ("trl" in lower):
        fit_points += 1
        opportunity += 10
        risk -= 10
        reasons.append("trl mentioned")

    stage_norm = stage.strip().lower()
    if stage_norm in {"pre-seed", "seed", "series-a"} and ("accelerator" in lower or "eic" in lower):
        fit_points += 1
        opportunity += 14
        risk -= 8
        reasons.append("stage aligns with venture-style funding track")

    if "grant" in lower or "funding" in lower:
        opportunity += 8
        risk -= 4
        reasons.append("explicit grant/funding wording")

    for program_key, hint_terms in PROGRAM_BONUS_HINTS.items():
        if program_key in lower and any(term in question.lower() for term in hint_terms):
            relevance += 14
            opportunity += 12
            risk -= 6
            reasons.append(f"query intent aligns with {program_key}")

    if "fallback" in lower:
        risk += 6

    relevance = max(0, min(100, relevance))
    opportunity = max(0, min(100, opportunity))
    risk = max(0, min(100, risk))
    total = int(round((relevance * 0.50) + (opportunity * 0.35) + ((100 - risk) * 0.15)))

    if fit_points >= 5:
        fit = "high"
    elif fit_points >= 3:
        fit = "medium"
    else:
        fit = "low"

    explanation = ", ".join(reasons) if reasons else "limited explicit profile alignment"
    return {
        "eligibilityFit": fit,
        "fitReason": explanation,
        "scores": {
            "relevance": relevance,
            "risk": risk,
            "opportunity": opportunity,
            "total": total,
        },
    }


def deadline_from_text(text: str) -> str:
    iso = re.search(r"\b(20\d{2})[-/](\d{2})[-/](\d{2})\b", text)
    if iso:
        return f"{iso.group(1)}-{iso.group(2)}-{iso.group(3)}"
    european = re.search(r"\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b", text)
    if european:
        day = int(european.group(1))
        month = int(european.group(2))
        year = int(european.group(3))
        return f"{year:04d}-{month:02d}-{day:02d}"
    return "unknown"


def deadline_urgency(deadline: str) -> str:
    if deadline == "unknown":
        return "unknown"
    try:
        d = dt.date.fromisoformat(deadline)
    except ValueError:
        return "unknown"
    delta = (d - dt.date.today()).days
    if delta <= 14:
        return "high"
    if delta <= 45:
        return "medium"
    return "low"


def collect_matches(question: str, stage: str, sector: str, trl: int | None, limit: int) -> dict[str, Any]:
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    matches: list[dict[str, Any]] = []
    source_log: list[dict[str, str]] = []
    source_grant_details: list[dict[str, Any]] = []

    for source in SOURCES:
        source_log.append(
            {
                "name": source["name"],
                "url": source["url"],
                "retrievedAt": now,
            }
        )
        try:
            html = fetch_html(source["url"])
        except Exception:
            source_grant_details.append(fallback_source_grant_details(source["name"], source["url"]))
            continue
        source_grant_details.append(extract_source_grant_details(source["name"], source["url"], html))

        anchors = extract_anchor_candidates(html, source["url"])
        for anchor in anchors:
            text = f"{anchor['title']} {anchor['url']}"
            if appears_procurement(text):
                continue
            if not appears_funding(text):
                continue

            overlap = keyword_overlap(text, question)
            if overlap == 0 and source["kind"] == "grant":
                continue

            reasoning = classify_and_score(text, question, stage, sector, trl)
            deadline = deadline_from_text(text)

            matches.append(
                {
                    "programName": anchor["title"],
                    "programType": source["kind"],
                    "fundingRange": "check source details",
                    "geography": "EU",
                    "eligibilityFit": reasoning["eligibilityFit"],
                    "fitReason": reasoning["fitReason"],
                    "scores": reasoning["scores"],
                    "reasoningStep": {
                        "classification": "funding-opportunity",
                        "rankingSignals": [
                            "keyword overlap",
                            "profile fit",
                            "deadline urgency",
                            "official source priority",
                        ],
                    },
                    "explanation": f"Matched because {reasoning['fitReason']}.",
                    "deadline": deadline,
                    "deadlineUrgency": deadline_urgency(deadline),
                    "sourceUrl": anchor["url"],
                    "retrievedAt": now,
                    "_rank": reasoning["scores"]["total"] + overlap,
                }
            )

    # deduplicate by URL and keep highest rank
    by_url: dict[str, dict[str, Any]] = {}
    for item in matches:
        existing = by_url.get(item["sourceUrl"])
        if existing is None or item["_rank"] > existing["_rank"]:
            by_url[item["sourceUrl"]] = item

    ranked = sorted(
        by_url.values(),
        key=lambda x: (
            {"high": 3, "medium": 2, "low": 1}.get(x["eligibilityFit"], 0),
            x["_rank"],
        ),
        reverse=True,
    )

    for item in ranked:
        item.pop("_rank", None)

    if not ranked:
        now = dt.datetime.now(dt.timezone.utc).isoformat()
        for program in FALLBACK_PROGRAMS:
            profile_text = f"{program['programName']} {program['fundingRange']}"
            reasoning = classify_and_score(profile_text, question, stage, sector, trl)
            default_deadline = "unknown"
            if "hanadiv" in program["programName"].lower():
                default_deadline = "2026-02-20"
            ranked.append(
                {
                    "programName": program["programName"],
                    "programType": program["programType"],
                    "fundingRange": program["fundingRange"],
                    "geography": program["geography"],
                    "eligibilityFit": reasoning["eligibilityFit"],
                    "fitReason": f"{reasoning['fitReason']}; fallback from official program pages",
                    "scores": reasoning["scores"],
                    "reasoningStep": {
                        "classification": "fallback-funding-opportunity",
                        "rankingSignals": [
                            "profile fit",
                            "official source fallback",
                        ],
                    },
                    "explanation": f"Included as official fallback because {reasoning['fitReason']}.",
                    "deadline": default_deadline,
                    "deadlineUrgency": deadline_urgency(default_deadline),
                    "sourceUrl": program["sourceUrl"],
                    "retrievedAt": now,
                }
            )
        ranked.sort(key=lambda x: x["scores"]["total"], reverse=True)

    return {"matches": ranked[:limit], "sources": source_log, "sourceGrantDetails": source_grant_details}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Find EU grants and funding programs")
    parser.add_argument("--question", required=True, help="Natural-language funding request")
    parser.add_argument("--country", default="", help="Startup country")
    parser.add_argument("--stage", default="", help="Startup stage")
    parser.add_argument("--sector", default="", help="Sector keyword")
    parser.add_argument("--trl", type=int, default=None, help="Technology readiness level")
    parser.add_argument("--language", default="bilingual", choices=["en", "de", "bilingual"])
    parser.add_argument("--limit", type=int, default=12)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result = collect_matches(
        question=args.question,
        stage=args.stage,
        sector=args.sector,
        trl=args.trl,
        limit=max(1, min(args.limit, 30)),
    )

    payload = {
        "queryContext": {
            "question": args.question,
            "country": args.country,
            "stage": args.stage,
            "sector": args.sector,
            "trl": args.trl,
            "language": args.language,
            "inferredFields": [],
        },
        "matches": result["matches"],
        "eligibilitySummary": {
            "overallFit": "high" if any(m["eligibilityFit"] == "high" for m in result["matches"]) else "medium",
            "blockingRisks": [] if result["matches"] else ["no high-confidence match from current source scan"],
        },
        "rankingMethod": {
            "reasoningStep": "classify each result, compute relevance/risk/opportunity scores, rank by weighted total",
            "weights": {
                "relevance": 0.50,
                "opportunity": 0.35,
                "risk_inverse": 0.15,
            },
        },
        "deadlines": [
            {
                "programName": m["programName"],
                "deadline": m["deadline"],
                "urgency": m["deadlineUrgency"],
            }
            for m in result["matches"]
        ],
        "nextActions": [
            "Open top 3 source URLs and confirm current call conditions.",
            "Check consortium, country, and TRL constraints per call.",
            "Validate final deadline on official call page before applying.",
        ],
        "sources": result["sources"],
        "sourceGrantDetails": result["sourceGrantDetails"],
        "language": args.language,
    }

    json.dump(payload, sys.stdout, ensure_ascii=True, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
