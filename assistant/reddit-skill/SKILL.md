---
name: "reddit"
description: "Use Reddit as Ben on his own account: read subreddits, rules, threads and comments; publish posts or comments only with his explicit per-action approval. Uses the stored custom.reddit OAuth credential."
---

# Reddit

## Purpose
Act on Reddit as Ben (his own account) through the official OAuth API. Two jobs: (1) read — subreddit rules, threads, comments — for research and drafting; (2) publish — posts and comments, only with his explicit approval of the exact text in chat. Built to support the word-of-mouth sprint (r/bootroom, r/soccer).

## Tooling
`bin/reddit.py [METHOD] [PATH] [JSON_BODY]` — thin client over `https://oauth.reddit.com`:

```
bin/reddit.py GET /api/v1/me
bin/reddit.py GET /r/bootroom/about/rules
bin/reddit.py GET /r/soccer/hot?limit=25
bin/reddit.py GET /r/bootroom/comments/abcdef/title_here?limit=50
bin/reddit.py POST /api/submit '{"sr":"bootroom","kind":"self","title":"...","text":"..."}'
bin/reddit.py POST /api/comment '{"thing_id":"t3_abcdef","text":"..."}'
```

JSON bodies are converted to form-encoded POST data (what Reddit expects). Sends Reddit's required descriptive User-Agent. Attaches the stored OAuth token via credential surrogate; never prints, logs, or persists raw credentials. Prints the first 8000 chars of the JSON response.

## Auth
Uses the stored `custom.reddit` connector (OAuth2 code flow; scopes: `identity`, `read`, `submit`). Nothing here collects credentials — setup is `credentials.request_api_access`. Token refresh is handled by the connector.

A 401 or 403 is a question about the request before it is a question about the credential: first verify the surrogate was attached and the granted scopes cover the endpoint. Only after a credential-carrying request is still rejected, consider `credentials.request_api_access` with `reconnect`.

## Operating Rules
1. Reading is always fine: subreddit rules, threads, comments, user profiles.
2. NEVER publish — no submits, no comments, no edits — without Ben's explicit approval of the exact text in chat first. A drafted post is not approval.
3. Never vote, never send private messages, never take moderator actions. The granted scopes don't include those; keep it that way.
4. Read a subreddit's rules before drafting anything for it. No spam, no cross-posting identical content.
5. Stay far under Reddit's 60 requests/minute OAuth limit. One call at a time, no bulk scraping or retention beyond what's needed for the immediate task.
6. Keep the User-Agent in `bin/reddit.py` accurate and update it with Ben's Reddit username once known. Never mask it.
7. All published content must comply with Reddit's rules and the Responsible Builder Policy.
