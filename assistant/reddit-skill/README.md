# Reddit assistant skill

Source code referenced in the Reddit API access request for the app
"Bob for The Mental Pitch".

What it is: a thin Python client (`bin/reddit.py`) plus operating instructions
(`SKILL.md`) used by a personal AI assistant acting on the account owner's own
Reddit account via OAuth2.

What it does:
- Reads subreddits: rules, threads, comments (scopes: `identity`, `read`)
- Publishes posts/comments ONLY with the account owner's explicit approval of
  the exact text first (scope: `submit`)

What it never does: vote, send private messages, bulk-scrape, retain data
beyond the immediate task, or train models on Reddit data.

No secrets are stored in this code. Authentication is handled by the
assistant's credential vault at runtime; this repo holds only the client.
