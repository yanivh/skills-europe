#!/usr/bin/env node

const TED_API_URL = "https://api.ted.europa.eu/v3/notices/search";
const TED_NOTICE_DETAIL_BASE = "https://ted.europa.eu/en/notice/-/detail";
const TED_NOTICE_API_BASE = "https://api.ted.europa.eu/v3/notices";

const SEARCH_FIELDS = [
  "publication-number",
  "publication-date",
  "organisation-country-buyer",
  "main-classification-lot",
  "BT-262-Lot",
  "BT-21-Procedure",
  "notice-title",
  "BT-24-Lot",
  "BT-105-Procedure",
  "deadline-receipt-tender-date-lot",
  "total-value",
];

const COUNTRY_CODE_MAP = {
  AT: "AUT",
  BE: "BEL",
  BG: "BGR",
  HR: "HRV",
  CY: "CYP",
  CZ: "CZE",
  DK: "DNK",
  EE: "EST",
  FI: "FIN",
  FR: "FRA",
  DE: "DEU",
  GR: "GRC",
  HU: "HUN",
  IE: "IRL",
  IT: "ITA",
  LV: "LVA",
  LT: "LTU",
  LU: "LUX",
  MT: "MLT",
  NL: "NLD",
  PL: "POL",
  PT: "PRT",
  RO: "ROU",
  SK: "SVK",
  SI: "SVN",
  ES: "ESP",
  SE: "SWE",
  NO: "NOR",
  CH: "CHE",
  UK: "GBR",
  GB: "GBR",
};

const COUNTRY_NAME_MAP = {
  austria: "AUT",
  belgium: "BEL",
  bulgaria: "BGR",
  croatia: "HRV",
  cyprus: "CYP",
  czechia: "CZE",
  "czech republic": "CZE",
  denmark: "DNK",
  estonia: "EST",
  finland: "FIN",
  france: "FRA",
  germany: "DEU",
  greece: "GRC",
  hungary: "HUN",
  ireland: "IRL",
  italy: "ITA",
  latvia: "LVA",
  lithuania: "LTU",
  luxembourg: "LUX",
  malta: "MLT",
  netherlands: "NLD",
  poland: "POL",
  portugal: "PRT",
  romania: "ROU",
  slovakia: "SVK",
  slovenia: "SVN",
  spain: "ESP",
  sweden: "SWE",
  norway: "NOR",
  switzerland: "CHE",
  "united kingdom": "GBR",
  uk: "GBR",
  britain: "GBR",
};

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "or",
  "the",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "with",
  "by",
  "from",
  "about",
  "show",
  "find",
  "search",
  "tenders",
  "tender",
  "notice",
  "notices",
  "procurement",
  "me",
  "we",
  "us",
  "our",
  "that",
  "this",
  "these",
  "those",
  "is",
  "are",
  "be",
  "can",
  "could",
  "should",
  "would",
]);

function parseArgs(argv) {
  const args = {
    question: "",
    logic: "",
    scope: "all",
    limit: 25,
    page: 1,
    output: "",
    format: "table",
    sort: "desc",
    withParties: true,
    help: false,
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const [flag, inlineValue] = token.split("=", 2);
    const nextValue = inlineValue ?? argv[i + 1];
    const consumeNext = inlineValue === undefined;

    if (flag === "--help" || flag === "-h") {
      args.help = true;
      continue;
    }

    if (flag === "--question" && typeof nextValue === "string") {
      args.question = nextValue;
      if (consumeNext) i += 1;
      continue;
    }

    if (flag === "--logic" && typeof nextValue === "string") {
      args.logic = nextValue;
      if (consumeNext) i += 1;
      continue;
    }

    if (flag === "--scope" && typeof nextValue === "string") {
      const normalizedScope = nextValue.toLowerCase();
      args.scope = normalizedScope === "active" || normalizedScope === "open" ? "active" : "all";
      if (consumeNext) i += 1;
      continue;
    }

    if (flag === "--limit" && typeof nextValue === "string") {
      const parsed = Number.parseInt(nextValue, 10);
      if (Number.isFinite(parsed)) {
        args.limit = Math.min(100, Math.max(1, parsed));
      }
      if (consumeNext) i += 1;
      continue;
    }

    if (flag === "--page" && typeof nextValue === "string") {
      const parsed = Number.parseInt(nextValue, 10);
      if (Number.isFinite(parsed)) {
        args.page = Math.max(1, parsed);
      }
      if (consumeNext) i += 1;
      continue;
    }

    if (flag === "--output" && typeof nextValue === "string") {
      args.output = nextValue;
      if (consumeNext) i += 1;
      continue;
    }

    if (flag === "--format" && typeof nextValue === "string") {
      const normalized = nextValue.toLowerCase();
      if (normalized === "json" || normalized === "table" || normalized === "both") {
        args.format = normalized;
      }
      if (consumeNext) i += 1;
      continue;
    }

    if (flag === "--sort" && typeof nextValue === "string") {
      const normalized = nextValue.toLowerCase();
      if (normalized === "asc" || normalized === "desc") {
        args.sort = normalized;
      }
      if (consumeNext) i += 1;
      continue;
    }

    if (flag === "--with-parties") {
      args.withParties = true;
      continue;
    }

    if (flag === "--without-parties") {
      args.withParties = false;
      continue;
    }
  }

  if (!args.question && positional.length > 0) {
    args.question = positional.join(" ");
  }

  return args;
}

function printUsage() {
  const usage = [
    "Usage:",
    "  node free_text_ted_query.mjs --question \"...\" [--logic \"...\"] [--scope active|open|all] [--limit 25] [--page 1] [--output path.json] [--format table|json|both] [--sort asc|desc] [--with-parties|--without-parties]",
    "",
    "Examples:",
    "  node free_text_ted_query.mjs --question \"water network software in germany\" --logic \"must include: software\" --format table",
    "  node free_text_ted_query.mjs --question 'FT~(\"stormwater\") AND CY IN (DEU)' --scope active --limit 10 --sort asc",
  ];
  process.stdout.write(`${usage.join("\n")}\n`);
}

function applySortClause(query, sortDirection) {
  // Keep TED API query stable on latest notices by date.
  const direction = "DESC";
  if (/\bSORT BY\b/i.test(query)) {
    return query.replace(
      /\bSORT\s+BY\s+[a-z-]+\s+(ASC|DESC)\b/i,
      `SORT BY publication-date ${direction}`,
    );
  }
  return `${query} SORT BY publication-date ${direction}`;
}

function comparePublicationDates(left, right, sortDirection) {
  const leftDateRaw = String(left?.publicationDate ?? "");
  const rightDateRaw = String(right?.publicationDate ?? "");
  const leftDate = Date.parse(leftDateRaw);
  const rightDate = Date.parse(rightDateRaw);

  if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) {
    return sortDirection === "asc" ? leftDate - rightDate : rightDate - leftDate;
  }

  const leftPubRaw = String(left?.publicationNumber ?? "");
  const rightPubRaw = String(right?.publicationNumber ?? "");
  const leftPub = Number.parseInt(leftPubRaw, 10);
  const rightPub = Number.parseInt(rightPubRaw, 10);

  if (Number.isFinite(leftPub) && Number.isFinite(rightPub) && leftPub !== rightPub) {
    return sortDirection === "asc" ? leftPub - rightPub : rightPub - leftPub;
  }

  return sortDirection === "asc"
    ? leftPubRaw.localeCompare(rightPubRaw)
    : rightPubRaw.localeCompare(leftPubRaw);
}

function sortNotices(notices, sortDirection) {
  return [...notices].sort((left, right) => comparePublicationDates(left, right, sortDirection));
}

function normalizeSpaces(value) {
  return value.replace(/\s+/g, " ").trim();
}

function hasTedSyntax(text) {
  return /\b(FT~|CY\s+IN|classification-cpv\s+IN|PD=|total-value=|SORT BY)\b/i.test(text);
}

function toTedCountryCode(value) {
  const upper = value.toUpperCase();
  if (COUNTRY_CODE_MAP[upper]) return COUNTRY_CODE_MAP[upper];
  return null;
}

function extractCountries(text) {
  const lower = text.toLowerCase();
  const found = new Set();

  for (const [name, tedCode] of Object.entries(COUNTRY_NAME_MAP)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(lower)) found.add(tedCode);
  }

  const tokens = text.split(/[^A-Za-z]+/).filter(Boolean);
  for (const token of tokens) {
    const tedCode = toTedCountryCode(token);
    if (tedCode) found.add(tedCode);
  }

  return [...found];
}

function extractCpvCodes(text) {
  const found = new Set();
  const matches = text.match(/\b\d{4,8}\*?\b/g) ?? [];
  for (const m of matches) {
    if (/^\d{4,8}\*?$/.test(m)) found.add(m);
  }
  return [...found];
}

function extractQuotedPhrases(text) {
  const phrases = [];
  const re = /"([^"]+)"/g;
  let match = re.exec(text);
  while (match) {
    const phrase = normalizeSpaces(match[1]);
    if (phrase) phrases.push(phrase);
    match = re.exec(text);
  }
  return phrases;
}

function extractValueBounds(text) {
  const input = text.toLowerCase();
  const parseAmount = (rawValue, suffix) => {
    const base = Number.parseFloat(rawValue.replace(/,/g, ""));
    if (!Number.isFinite(base)) return null;
    if (suffix === "k") return Math.round(base * 1_000);
    if (suffix === "m") return Math.round(base * 1_000_000);
    if (suffix === "b") return Math.round(base * 1_000_000_000);
    return Math.round(base);
  };

  let minValue = null;
  let maxValue = null;

  const minMatch = input.match(/(?:min(?:imum)?|over|above|greater than|at least)\s*(?:eur|euro|€)?\s*([\d.,]+)\s*([kmb])?/i);
  if (minMatch) minValue = parseAmount(minMatch[1], minMatch[2]);

  const maxMatch = input.match(/(?:max(?:imum)?|under|below|less than|at most)\s*(?:eur|euro|€)?\s*([\d.,]+)\s*([kmb])?/i);
  if (maxMatch) maxValue = parseAmount(maxMatch[1], maxMatch[2]);

  return { minValue, maxValue };
}

function extractDateClause(text) {
  const years = [...new Set((text.match(/\b20\d{2}\b/g) ?? []).map((v) => Number.parseInt(v, 10)))];
  if (years.length >= 2) {
    const sorted = years.sort((a, b) => a - b);
    return `PD=(${sorted[0]}0101 <> ${sorted[sorted.length - 1]}1231)`;
  }
  if (years.length === 1) {
    const year = years[0];
    if (/\b(before|until|up to)\b/i.test(text)) return `PD=(<=${year}1231)`;
    if (/\b(after|since|from)\b/i.test(text)) return `PD=(>=${year}0101)`;
  }
  return null;
}

function cleanBareTerms(text, phrases) {
  let candidate = text;
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    candidate = candidate.replace(new RegExp(`"${escaped}"`, "g"), " ");
  }
  candidate = candidate.replace(/\b20\d{2}\b/g, " ");
  candidate = candidate.replace(/\b\d{4,8}\*?\b/g, " ");
  candidate = candidate.replace(/[^A-Za-z0-9*_ -]/g, " ");
  const tokens = candidate
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .filter((token) => token.length >= 3)
    .filter((token) => !STOPWORDS.has(token))
    .filter((token) => !COUNTRY_NAME_MAP[token])
    .filter((token) => !toTedCountryCode(token));
  return [...new Set(tokens)].slice(0, 10);
}

function generateTedQuery(question, sortDirection = "desc") {
  const normalized = normalizeSpaces(question);
  if (!normalized) {
    return applySortClause('FT~("procurement")', sortDirection);
  }

  if (hasTedSyntax(normalized)) {
    return applySortClause(normalized, sortDirection);
  }

  const phrases = extractQuotedPhrases(normalized);
  const bareTerms = cleanBareTerms(normalized, phrases);
  const textAtoms = [
    ...phrases.map((phrase) => `"${phrase}"`),
    ...bareTerms,
  ];

  const textClause = textAtoms.length > 0
    ? `FT~(${textAtoms.join(" OR ")})`
    : 'FT~("procurement")';

  const clauses = [textClause];

  const countries = extractCountries(normalized);
  if (countries.length > 0) {
    clauses.push(`CY IN (${countries.join(" ")})`);
  }

  const cpvCodes = extractCpvCodes(normalized);
  if (cpvCodes.length > 0) {
    clauses.push(`classification-cpv IN (${cpvCodes.join(" ")})`);
  }

  const dateClause = extractDateClause(normalized);
  if (dateClause) clauses.push(dateClause);

  const { minValue, maxValue } = extractValueBounds(normalized);
  if (minValue !== null) clauses.push(`total-value=(>=${minValue})`);
  if (maxValue !== null) clauses.push(`total-value=(<=${maxValue})`);

  return applySortClause(clauses.join(" AND "), sortDirection);
}

function toNumber(rawValue, suffix) {
  const n = Number.parseFloat(rawValue.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (suffix === "k") return Math.round(n * 1_000);
  if (suffix === "m") return Math.round(n * 1_000_000);
  if (suffix === "b") return Math.round(n * 1_000_000_000);
  return Math.round(n);
}

function parseLogicPrompt(logicPrompt) {
  const normalized = logicPrompt ?? "";
  const includeTerms = [];
  const excludeTerms = [];
  const explicitCountries = [];

  const segments = normalized
    .split(/[;\n]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const includeMatch = segment.match(/^(?:must include|include|require|required)\s*:\s*(.+)$/i);
    if (includeMatch) {
      includeTerms.push(
        ...includeMatch[1]
          .split(/[,\|]/)
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean),
      );
      continue;
    }

    const excludeMatch = segment.match(/^(?:must exclude|exclude|without|must not include)\s*:\s*(.+)$/i);
    if (excludeMatch) {
      excludeTerms.push(
        ...excludeMatch[1]
          .split(/[,\|]/)
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean),
      );
      continue;
    }

    const countryMatch = segment.match(/^country\s*:\s*(.+)$/i);
    if (countryMatch) {
      explicitCountries.push(
        ...countryMatch[1]
          .split(/[,\|]/)
          .map((entry) => entry.trim())
          .filter(Boolean)
          .map((entry) => {
            const upper = entry.toUpperCase();
            const byCode = normalizeCountryCode(upper);
            if (byCode) return byCode;
            const byName = COUNTRY_NAME_MAP[entry.toLowerCase()];
            return byName ?? null;
          })
          .filter(Boolean),
      );
    }
  }

  const inferredCountries = extractCountries(normalized);
  const countries = explicitCountries.length > 0 ? explicitCountries : inferredCountries;

  let minValue = null;
  let maxValue = null;
  const minMatch = normalized.match(/(?:min(?:imum)?|over|above|greater than|at least)\s*(?:eur|euro|€)?\s*([\d.,]+)\s*([kmb])?/i);
  if (minMatch) minValue = toNumber(minMatch[1], minMatch[2]);
  const maxMatch = normalized.match(/(?:max(?:imum)?|under|below|less than|at most)\s*(?:eur|euro|€)?\s*([\d.,]+)\s*([kmb])?/i);
  if (maxMatch) maxValue = toNumber(maxMatch[1], maxMatch[2]);

  return {
    includeTerms: [...new Set(includeTerms)],
    excludeTerms: [...new Set(excludeTerms)],
    countries: [...new Set(countries)],
    minValue,
    maxValue,
  };
}

function scopeToTedValue(scope) {
  return scope === "active" ? 1 : 2;
}

async function searchTed({ query, scope, limit, page }) {
  const body = {
    query,
    fields: SEARCH_FIELDS,
    scope: scopeToTedValue(scope),
    limit,
    page,
  };

  const response = await fetch(TED_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`TED API ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return {
    notices: data.notices ?? [],
    totalNoticeCount: data.totalNoticeCount ?? 0,
  };
}

function asText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(" ");
  if (typeof value === "object") return Object.values(value).map(asText).filter(Boolean).join(" ");
  return "";
}

function extractCountryFromNotice(notice) {
  const raw = notice["organisation-country-buyer"];
  const text = asText(raw).trim();
  if (!text) return null;
  if (COUNTRY_CODE_MAP[text.toUpperCase()]) return COUNTRY_CODE_MAP[text.toUpperCase()];
  if (/^[A-Z]{3}$/.test(text.toUpperCase())) return text.toUpperCase();
  const byName = COUNTRY_NAME_MAP[text.toLowerCase()];
  return byName ?? null;
}

function normalizeCountryCode(value) {
  if (!value) return null;
  const text = asText(value).trim().toUpperCase();
  if (!text) return null;
  if (COUNTRY_CODE_MAP[text]) return COUNTRY_CODE_MAP[text];
  if (/^[A-Z]{3}$/.test(text)) return text;
  if (/^[A-Z]{2}$/.test(text) && COUNTRY_CODE_MAP[text]) return COUNTRY_CODE_MAP[text];
  return null;
}

async function fetchNoticeDetail(publicationNumber) {
  if (!publicationNumber) return null;
  const url = `${TED_NOTICE_API_BASE}/${publicationNumber}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchNoticeXml(publicationNumber) {
  if (!publicationNumber) return null;
  const url = `https://ted.europa.eu/en/notice/${publicationNumber}/xml`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/xml" },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function extractBuyerAndWinnersFromDetail(detail) {
  const parties = Array.isArray(detail?.parties) ? detail.parties : [];
  const organisations = Array.isArray(detail?.organisations) ? detail.organisations : [];

  let buyerName = null;
  let buyerCountry = null;

  const buyerParty = parties.find((party) => {
    const roles = Array.isArray(party?.roles) ? party.roles : [];
    return roles.includes("buyer");
  });

  if (buyerParty?.organization) {
    const org = buyerParty.organization;
    buyerName = asText(org.officialName) || asText(org.name) || null;
    buyerCountry = normalizeCountryCode(org?.address?.country);
  }

  if (!buyerName) {
    for (const org of organisations) {
      const roles = Array.isArray(org?.roles) ? org.roles : [];
      const role = asText(org?.role).toLowerCase();
      if (roles.includes("buyer") || role === "buyer") {
        buyerName = asText(org.officialName) || asText(org.name) || null;
        buyerCountry = buyerCountry || normalizeCountryCode(org?.address?.country);
        break;
      }
    }
  }

  const winnerCandidates = [];
  for (const party of parties) {
    const roles = Array.isArray(party?.roles) ? party.roles : [];
    if (!roles.includes("contractor") && !roles.includes("tenderer")) continue;
    const org = party.organization || {};
    const name = asText(org.officialName) || asText(org.name) || null;
    if (name) winnerCandidates.push(name);
  }

  const deduped = [...new Set(winnerCandidates)];
  const winnerNames = buyerName
    ? deduped.filter((winner) => winner.toLowerCase().trim() !== buyerName.toLowerCase().trim())
    : deduped;

  return {
    buyerName,
    buyerCountry,
    winnerName: winnerNames[0] ?? null,
    winnerNames,
  };
}

function stripXmlTags(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseBuyerAndWinnersFromXml(xml) {
  let buyerName = null;
  let buyerCountry = null;

  const orgMap = new Map();
  for (const match of xml.matchAll(/<efac:Organization[^>]*>([\s\S]*?)<\/efac:Organization>/gi)) {
    const block = match[0];
    const idMatch = block.match(/<cbc:ID[^>]*schemeName="organization"[^>]*>([^<]+)<\/cbc:ID>/i);
    if (!idMatch?.[1]) continue;
    const orgId = idMatch[1].trim();
    const nameMatch = block.match(/<cac:PartyName>\s*<cbc:Name[^>]*>([^<]+)<\/cbc:Name>/i)
      || block.match(/<efbc:CompanyName[^>]*>([^<]+)<\/efbc:CompanyName>/i)
      || block.match(/<cbc:Name[^>]*>([^<]+)<\/cbc:Name>/i);
    const countryMatch = block.match(/<cbc:IdentificationCode[^>]*listName="country"[^>]*>([A-Z]{2,3})<\/cbc:IdentificationCode>/i)
      || block.match(/<cac:Country>\s*<cbc:IdentificationCode[^>]*>([A-Z]{2,3})<\/cbc:IdentificationCode>/i);
    orgMap.set(orgId, {
      name: nameMatch?.[1] ? stripXmlTags(nameMatch[1]) : null,
      country: countryMatch?.[1] ? normalizeCountryCode(countryMatch[1]) : null,
    });
  }

  const contractingPartyBlock = xml.match(/<cac:ContractingParty>[\s\S]*?<\/cac:ContractingParty>/i);
  if (contractingPartyBlock) {
    const buyerOrgIdMatch = contractingPartyBlock[0].match(/<cac:PartyIdentification>\s*<cbc:ID[^>]*schemeName="organization"[^>]*>([^<]+)<\/cbc:ID>/i);
    if (buyerOrgIdMatch?.[1]) {
      const buyerOrg = orgMap.get(buyerOrgIdMatch[1].trim());
      if (buyerOrg?.name) buyerName = buyerOrg.name;
      if (buyerOrg?.country) buyerCountry = buyerOrg.country;
    }
  }

  const addressContractingBody = xml.match(/<ADDRESS_CONTRACTING_BODY[^>]*>([\s\S]*?)<\/ADDRESS_CONTRACTING_BODY>/i);
  if (addressContractingBody) {
    const officialName = addressContractingBody[1].match(/<OFFICIALNAME[^>]*>([\s\S]*?)<\/OFFICIALNAME>/i);
    if (officialName) {
      const parsed = stripXmlTags(officialName[1]);
      if (parsed.length > 2) buyerName = parsed;
    }
    const countryMatch = addressContractingBody[1].match(/<COUNTRY[^>]*VALUE="([A-Z]{2,3})"[^>]*>/i);
    if (countryMatch) buyerCountry = normalizeCountryCode(countryMatch[1]);
  }

  if (!buyerName) {
    const buyerOrgBlock = xml.match(/<efac:Organization[^>]*>[\s\S]*?<efbc:RoleCode[^>]*>\s*buyer\s*<\/efbc:RoleCode>[\s\S]*?<\/efac:Organization>/i);
    if (buyerOrgBlock) {
      const nameMatch = buyerOrgBlock[0].match(/<efbc:CompanyName[^>]*>([^<]+)<\/efbc:CompanyName>/i)
        || buyerOrgBlock[0].match(/<cbc:Name[^>]*>([^<]+)<\/cbc:Name>/i);
      if (nameMatch?.[1]) buyerName = stripXmlTags(nameMatch[1]);
      const countryMatch = buyerOrgBlock[0].match(/<cbc:IdentificationCode[^>]*>([A-Z]{2,3})<\/cbc:IdentificationCode>/i);
      if (countryMatch?.[1]) buyerCountry = normalizeCountryCode(countryMatch[1]);
    }
  }

  const winnerCandidates = [];
  for (const tpa of xml.matchAll(/<efac:TenderingParty>[\s\S]*?<\/efac:TenderingParty>/gi)) {
    for (const tenderer of tpa[0].matchAll(/<efac:Tenderer>\s*<cbc:ID[^>]*schemeName="organization"[^>]*>([^<]+)<\/cbc:ID>/gi)) {
      const org = orgMap.get(tenderer[1].trim());
      if (org?.name) winnerCandidates.push(org.name);
    }
  }
  for (const match of xml.matchAll(/<CONTRACTOR[^>]*>[\s\S]*?<OFFICIALNAME[^>]*>([\s\S]*?)<\/OFFICIALNAME>/gi)) {
    const name = stripXmlTags(match[1]);
    if (name.length > 2) winnerCandidates.push(name);
  }
  for (const match of xml.matchAll(/<ECONOMIC_OPERATOR_NAME(?![_A-Z])[^>]*>([^<]+)<\/ECONOMIC_OPERATOR_NAME>/gi)) {
    const name = stripXmlTags(match[1]);
    if (name.length > 2) winnerCandidates.push(name);
  }
  for (const match of xml.matchAll(/<efac:Organization[^>]*>[\s\S]*?<efbc:RoleCode[^>]*>\s*winner\s*<\/efbc:RoleCode>[\s\S]*?<\/efac:Organization>/gi)) {
    const nameMatch = match[0].match(/<efbc:CompanyName[^>]*>([^<]+)<\/efbc:CompanyName>/i)
      || match[0].match(/<cbc:Name[^>]*>([^<]+)<\/cbc:Name>/i);
    if (nameMatch?.[1]) {
      const name = stripXmlTags(nameMatch[1]);
      if (name.length > 2) winnerCandidates.push(name);
    }
  }

  const deduped = [...new Set(winnerCandidates)];
  const winnerNames = buyerName
    ? deduped.filter((winner) => winner.toLowerCase().trim() !== buyerName.toLowerCase().trim())
    : deduped;

  return {
    buyerName,
    buyerCountry,
    winnerName: winnerNames[0] ?? null,
    winnerNames,
  };
}

function extractValueFromNotice(notice) {
  const candidates = [
    notice["total-value"],
    notice["BT-27-Lot"],
    notice["BT-27-Procedure"],
    notice["value"],
  ];
  for (const candidate of candidates) {
    const text = asText(candidate);
    if (!text) continue;
    const match = text.match(/[\d,.]+/);
    if (!match) continue;
    const parsed = Number.parseFloat(match[0].replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function buildNoticeText(notice) {
  const fragments = [
    asText(notice["BT-21-Procedure"]),
    asText(notice["notice-title"]),
    asText(notice["BT-24-Lot"]),
    asText(notice["BT-105-Procedure"]),
    asText(notice["main-classification-lot"]),
    asText(notice["BT-262-Lot"]),
  ];
  return normalizeSpaces(fragments.filter(Boolean).join(" ")).toLowerCase();
}

function evaluateNotice(notice, rules) {
  const haystack = buildNoticeText(notice);
  const noticeCountry = extractCountryFromNotice(notice);
  const noticeValue = extractValueFromNotice(notice);

  const includeMisses = rules.includeTerms.filter((term) => !haystack.includes(term));
  const excludeHits = rules.excludeTerms.filter((term) => haystack.includes(term));
  const countryFail = rules.countries.length > 0 && (!noticeCountry || !rules.countries.includes(noticeCountry));
  const minFail = rules.minValue !== null && (noticeValue === null || noticeValue < rules.minValue);
  const maxFail = rules.maxValue !== null && (noticeValue === null || noticeValue > rules.maxValue);

  const pass = includeMisses.length === 0 && excludeHits.length === 0 && !countryFail && !minFail && !maxFail;

  const matchedIncludes = rules.includeTerms.filter((term) => haystack.includes(term));
  const score = matchedIncludes.length;

  return {
    pass,
    score,
    noticeCountry,
    noticeValue,
    includeMisses,
    excludeHits,
    countryFail,
    minFail,
    maxFail,
  };
}

function conciseNotice(notice, evaluation) {
  const publicationNumber = asText(notice["publication-number"]);
  return {
    publicationNumber,
    noticeUrl: publicationNumber ? `${TED_NOTICE_DETAIL_BASE}/${publicationNumber}` : "",
    publicationDate: asText(notice["publication-date"]),
    title: asText(notice["BT-21-Procedure"]) || asText(notice["notice-title"]),
    procedureType: asText(notice["BT-105-Procedure"]),
    buyerName: null,
    buyerCountry: evaluation.noticeCountry,
    winnerName: null,
    winnerNames: [],
    estimatedValue: evaluation.noticeValue,
    score: evaluation.score,
    pass: evaluation.pass,
    matchReasons: {
      includeMisses: evaluation.includeMisses,
      excludeHits: evaluation.excludeHits,
      countryFail: evaluation.countryFail,
      minFail: evaluation.minFail,
      maxFail: evaluation.maxFail,
    },
  };
}

function escapeMarkdownCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function formatDateCell(value) {
  const text = String(value ?? "");
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
}

function formatValueCell(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${Math.round(value).toLocaleString("en-US")} EUR`;
  }
  return escapeMarkdownCell(value);
}

function toMarkdownTable(notices) {
  const header = [
    "| Date | Notice | Title | Buyer | Country | Winner | Procedure | Estimated Value |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  const rows = notices.map((notice) => {
    const publicationNumber = escapeMarkdownCell(notice.publicationNumber || "-");
    const noticeUrl = notice.noticeUrl ? notice.noticeUrl : `${TED_NOTICE_DETAIL_BASE}/${publicationNumber}`;
    const noticeLink = publicationNumber === "-" ? "-" : `[${publicationNumber}](${noticeUrl})`;

    return [
      `| ${escapeMarkdownCell(formatDateCell(notice.publicationDate))}`,
      `${noticeLink}`,
      `${escapeMarkdownCell(notice.title || "-")}`,
      `${escapeMarkdownCell(notice.buyerName || "-")}`,
      `${escapeMarkdownCell(notice.buyerCountry || "-")}`,
      `${escapeMarkdownCell(notice.winnerName || "-")}`,
      `${escapeMarkdownCell(notice.procedureType || "-")}`,
      `${escapeMarkdownCell(formatValueCell(notice.estimatedValue))} |`,
    ].join(" | ");
  });

  return [...header, ...rows].join("\n");
}

function printFormattedOutput(args, output) {
  const summary = [
    `Query: ${output.generatedQuery}`,
    `Matched: ${output.scan.matchedCount} / ${output.scan.allEvaluatedCount} returned notices`,
    `TED totalNoticeCount: ${output.tedApi.totalNoticeCount}`,
  ];

  if (args.format === "json") {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return;
  }

  const table = toMarkdownTable(output.notices);
  const tableBlock = output.notices.length > 0 ? table : "_No matching notices found._";
  const tableOutput = `${summary.join("\n")}\n\n${tableBlock}\n`;

  if (args.format === "table") {
    process.stdout.write(tableOutput);
    return;
  }

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n\n${tableOutput}`);
}

async function maybeWriteOutput(path, payload) {
  if (!path) return;
  const fs = await import("node:fs/promises");
  const filePath = await import("node:path");
  const fullPath = filePath.resolve(path);
  await fs.mkdir(filePath.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(payload, null, 2), "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.question.trim()) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const generatedQuery = generateTedQuery(args.question, args.sort);
  const rules = parseLogicPrompt(args.logic);

  const apiResult = await searchTed({
    query: generatedQuery,
    scope: args.scope,
    limit: args.limit,
    page: args.page,
  });

  const evaluated = apiResult.notices.map((notice) => {
    const evaluation = evaluateNotice(notice, rules);
    return conciseNotice(notice, evaluation);
  });

  const hasRules =
    rules.includeTerms.length > 0 ||
    rules.excludeTerms.length > 0 ||
    rules.countries.length > 0 ||
    rules.minValue !== null ||
    rules.maxValue !== null;

  const filtered = hasRules ? evaluated.filter((row) => row.pass) : evaluated;

  if (args.withParties && filtered.length > 0) {
    const enriched = await Promise.all(
      filtered.map(async (row) => {
        const detail = await fetchNoticeDetail(row.publicationNumber);
        const extractedFromDetail = detail ? extractBuyerAndWinnersFromDetail(detail) : {
          buyerName: null,
          buyerCountry: null,
          winnerName: null,
          winnerNames: [],
        };

        let extracted = extractedFromDetail;
        const needsXmlFallback =
          !extracted.buyerName ||
          !extracted.buyerCountry ||
          !extracted.winnerName;

        if (needsXmlFallback) {
          const xml = await fetchNoticeXml(row.publicationNumber);
          if (xml) {
            const extractedFromXml = parseBuyerAndWinnersFromXml(xml);
            extracted = {
              buyerName: extracted.buyerName || extractedFromXml.buyerName,
              buyerCountry: extracted.buyerCountry || extractedFromXml.buyerCountry,
              winnerName: extracted.winnerName || extractedFromXml.winnerName,
              winnerNames: extracted.winnerNames.length > 0 ? extracted.winnerNames : extractedFromXml.winnerNames,
            };
          }
        }

        return {
          ...row,
          buyerName: extracted.buyerName || row.buyerName,
          buyerCountry: extracted.buyerCountry || row.buyerCountry,
          winnerName: extracted.winnerName || row.winnerName,
          winnerNames: extracted.winnerNames?.length ? extracted.winnerNames : row.winnerNames,
        };
      }),
    );
    filtered.length = 0;
    filtered.push(...enriched);
  }

  const sortedNotices = sortNotices(filtered, args.sort);

  const output = {
    input: {
      question: args.question,
      logicPrompt: args.logic,
      scope: args.scope,
      limit: args.limit,
      sort: args.sort,
      page: args.page,
      withParties: args.withParties,
    },
    generatedQuery,
    appliedRules: rules,
    tedApi: {
      totalNoticeCount: apiResult.totalNoticeCount,
      returnedNoticeCount: apiResult.notices.length,
    },
    scan: {
      hasRules,
      matchedCount: sortedNotices.length,
      allEvaluatedCount: evaluated.length,
    },
    notices: sortedNotices,
  };

  await maybeWriteOutput(args.output, output);
  printFormattedOutput(args, output);
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exit(1);
});
