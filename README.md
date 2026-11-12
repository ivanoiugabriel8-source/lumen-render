# lumen-render

Randare video pe server pentru **Lumen Studio**: aplicația cere randarea, GitHub Actions
randează animațiile cu Remotion și urcă MP4-ul în Supabase (bucket-ul `renders`).

## Cum funcționează
1. Aplicația apelează funcția Supabase `start-render` (creează un rând în `render_jobs` și pornește workflow-ul).
2. Workflow-ul `Randare video` rulează `scripts/render.ts`: descarcă scenele, vocea, imaginile și muzica,
   randează 1080x1920 (9:16) sau 1920x1080 (16:9), urcă fișierul și marchează jobul `done`.
3. Aplicația afișează progresul și butonul de descărcare.

## Secrete necesare (GitHub → Settings → Secrets and variables → Actions)
- `SUPABASE_URL` – adresa proiectului Supabase
- `SUPABASE_SERVICE_ROLE_KEY` – cheia service_role (SECRETĂ: nu o pune în cod și nu o trimite nimănui)

## Test local (opțional)
```
npm ci
npm run render:demo      # produce out/demo-9x16.mp4 din date de probă
```

## Fișiere importante
- `src/SceneView.tsx` – cele 7 șabloane, portate 1:1 din `SceneRenderer.tsx` din aplicație
- `src/Video.tsx` – asamblarea scenelor, vocea, muzica (fade-in 1 s, fade-out 1,5 s) și subtitrările
- `scripts/render.ts` – fluxul de producție (Supabase → randare → încărcare)
