# Local end-to-end check

Runs the real backend routes and the real AI service on this machine with fake sign-in and fake stored data, so the frontend can be exercised against live HTTP. **For development only.**

```bash
python scripts/local_e2e/ai.py &                               # AI service on :8101 (internal key "k")
(cd zelta_backend && ALLOWED_ORIGINS=http://localhost:3000 python ../scripts/local_e2e/backend.py &)   # backend on :8100
NEXT_API_URL=http://localhost:8100 NEXT_DEV_BEARER=x pnpm build && pnpm start
```

`NEXT_DEV_BEARER` skips sign-in and is honoured only when `NEXT_API_URL` points at localhost.
