Avatar storage notes

The profile page uploads avatar images to a Storage bucket. By default the app uses a bucket named `avatars`, but you can configure a different bucket name via the environment variable `VITE_AVATAR_BUCKET`.

How to create the bucket in Supabase:
1. Open Supabase Studio → Storage → Buckets → Create new bucket.
2. Name the bucket `avatars` (or a custom name) and choose Public if you want direct public URLs.
3. If you keep the bucket private, the app will try to generate a signed URL as fallback (short-lived).

How to set the env var locally (macOS zsh):

```bash
# add to .env.local or .env
VITE_AVATAR_BUCKET=avatars
```

Restart the dev server after changing env vars.

If you still see "Bucket not found":
- Verify the exact bucket name (case-sensitive) matches the env var.
- Check Storage → Buckets list to confirm it exists and you are in the correct Supabase project.
- If necessary, create the bucket and retry uploading from the UI.
