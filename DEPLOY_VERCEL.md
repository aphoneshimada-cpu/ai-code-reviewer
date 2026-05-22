# Deploy ke Vercel

## Cara cepat (UI dashboard, ~2 menit)

1. Buka https://vercel.com/new
2. Login pakai GitHub (`aphoneshimada-cpu`)
3. Klik **Import** di repo `ai-code-reviewer`
4. Framework Preset: **Other** (auto-detect Node.js)
5. Root Directory: biarin `./`
6. Build Command: kosongin
7. Output Directory: kosongin
8. Klik **Environment Variables**, tambahkan:
   - `MIMO_API_KEY` = (dari email Xiaomi setelah approve)
   - `MIMO_API_URL` = `https://api.xiaomimimo.com`
   - `GITHUB_TOKEN` = (classic PAT, scope `repo`)
   - `GITHUB_WEBHOOK_SECRET` = (random string, sama dgn yg dipasang di GitHub webhook nanti)
9. **Deploy**

URL keluar dalam ~30 detik: `https://ai-code-reviewer-xxx.vercel.app`

## Tes endpoint

```bash
curl https://YOUR-VERCEL-URL.vercel.app/api/health
```

Output: `{"status":"ok","service":"ai-code-reviewer",...}`

## Pasang webhook GitHub (setelah deploy)

Repo target → Settings → Webhooks → Add webhook:
- Payload URL: `https://YOUR-VERCEL-URL.vercel.app/api/webhook`
- Content type: `application/json`
- Secret: sama dengan `GITHUB_WEBHOOK_SECRET` di Vercel
- Events: **Pull requests**

## Cara CLI (alternatif)

```bash
npm i -g vercel
cd ai-code-reviewer
vercel login
vercel --prod
# pas prompt env, paste 4 var di atas
```

## Catatan limit Vercel Hobby

- Function timeout: 10s (cukup utk webhook karena kita reply 202 dulu, review jalan async)
- Memory: 1024MB
- Cold start: ~200–800ms
- Free tier OK untuk PR volume <1000/hari
