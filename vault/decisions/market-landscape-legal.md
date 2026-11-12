---
title: Decision — realestate.com.kh market data needs written permission before prod
type: decision
status: proposed (owner to accept; not legal advice)
source: realestate.com.kh /legal/ + /robots.txt, read 2026-11-12; branch feat/market-landscape
tags: [decision, legal, data, market-landscape]
added: 2026-11-12
---

## Verdict
Fetching realestate.com.kh's portal API live (what `lib/services/market-landscape.ts` does) is
**not defensible under their stated terms**, on staging or prod. There is no public API, data
licence, or partner programme to sign up to. The only compliant path is **written permission**
from Online Real Estate Co., Ltd. (the operator named in the terms). Ship the code with the flag
OFF; turn it on in prod only with that permission on file. Not legal advice: have counsel check
it before relying on it.

## What the sources say (quoted, fetched 2026-11-12)
- **robots.txt** (<https://www.realestate.com.kh/robots.txt>), `User-agent: *` → `Disallow: /api/`
  and `Disallow: /v1/`. Our endpoint, `/api/portal/pages/results/`, is under `/api/`. Confirmed.
- **Terms & Conditions** (<https://www.realestate.com.kh/legal/>) cover "websites … apps, APIs and
  widgets", bind anyone who "browse[s] or otherwise access[es] any content or data", are governed by
  **Cambodian law**, and send disputes to Cambodian courts. Users agree they will not:
  - (a) "use any automated device, software, process or means to access, retrieve, scrape, or index
    our websites or any content on our website";
  - (d) "use or index any content or data … for purposes of: (i) constructing or populating a
    searchable database of properties, (ii) building a database of property information; or (iii)
    competing with us in any manner that we have not specifically authorised";
  - (j) "reproduce, republish, retransmit … publicly display … or in any way exploit … any content on
    our website, except as expressly authorised by us".
- **Copyright clause:** visitors may download material "only for private and non-commercial
  purposes". Anything beyond that needs "written permission … obtained directly from
  realestate.com.kh or the relevant copyright owner". If granted, the owner's name must be
  acknowledged.
- **Linking policy:** "You may only link to content on our websites if we consent". No linking "as
  part of a website that aggregates property listings and/or information or competes with us".
- **Indemnity:** the user indemnifies them for loss "arising out of … your use of and access to our
  websites" contrary to the terms.
- **No data product found.** The footer has Market Trends, Survey & Reports, Advertise with us
  (`/advertise-on-realestate/`), and Contact (`/contact/`). There is no API, developer, or licensing
  page. The contact in the terms is `info@realestate.com.kh`.
- Cambodian law: the terms mention "fair dealing permitted by Cambodia Law". I make no claim about
  what that covers for a commercial product. Counsel question.

## (a) Is live fetching defensible?
No. It is automated access (a). It is to a path robots.txt disallows. It republishes medians,
listings, photos and links inside our product (j, copyright, linking). Our product is a property
database, which is exactly the use (d)(ii) names. Attribution ("Data © realestate.com.kh") is
required **if** permission is given, but it does not stand in for permission. Caching (1 h / 6 h)
lowers traffic (c), but it is still retrieval and republication.

## (b) Compliant path
1. **Written licence or permission** from realestate.com.kh. Ask through `/advertise-on-realestate/`
   or `/contact/` (info@realestate.com.kh). Scope: area statistics + N listings per pin, image
   use, linking, attribution text, rate/caching, commercial use, and whether the API may be called
   server-to-server. Keep the signed text in the vault.
2. **Without permission:** use data we have rights to, i.e. the own-portfolio comps already in
   `lib/data/derivations/property-comparables.ts`, or a licensed/public source. If we only link out
   to their public search pages, the linking policy applies: "only … if we consent".
3. Listing photos belong to the agents or photographers too. A licence from the portal may not
   cover them, so ask that explicitly.

## (c) Recommended posture
- **Code:** merge to staging with `MARKET_LANDSCAPE_ENABLED` unset (the code's default: off, no
  outbound call).
- **Staging flag ON:** this is an owner risk call, not a compliant state. Every staging fetch is
  still automated access under (a). If the owner accepts it for internal evaluation, keep staging
  behind auth, internal accounts only, keep the caches, no demos to third parties, and set an end
  date. Lower-risk option: evaluate against the committed fixtures (`tests/fixtures/market-landscape/`).
- **Prod:** flag stays OFF until written permission is on file and this note is updated to
  `accepted` with a link to it.

## (d) Risk if prod uses it without permission
- Breach of contract under their terms. Remedies: termination, take-down demand, damages, and the
  indemnity, which shifts their legal costs to us. Disputes go to Cambodian courts.
- Copyright claims over republished listing content and photos (theirs and the agents').
- Technical blocking. They reserve "technological barriers", which means the feature dies without
  warning and the v1 endpoint answers 502. The iOS surface would break in front of users.
- Reputational: a property-data startup caught scraping the market leader, which is also the
  likeliest partner for a licence.

## Links
- [[ruthless-mvp-cut]] · [[gotchas]] · branch `feat/market-landscape` (b7aee2d…1f99cf6)
