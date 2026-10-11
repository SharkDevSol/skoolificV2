# Frontend deploy rules — iqra.skoolific.com and bilal.skoolific.com

Live docroots:
- `/var/www/iqra.skoolific.com/APP/dist`
- `/var/www/bilal.skoolific.com/APP/dist`

## Canonical repository
The frontend may ONLY be built and deployed from the TRUE canonical repository:

    C:/Users/hp/Desktop/v.2/skoolificV2-git  (git: github.com/SharkDevSol/skoolificV2, branch main)

NEVER build or deploy from `v2-github-new` or `SCHOOLS/SCHOOLS` — those are obsolete checkouts.

## How to deploy
1. In `C:/Users/hp/Desktop/v.2/skoolificV2-git/APP`: `npm run build`
   (this writes `dist/BUILD_INFO.json` identifying `skoolificV2-git`)
2. Package: `tar -czf build.tgz -C dist .`
3. Upload to server, then run:
   - For Iqra: `deploy-iqra /path/to/build.tgz`
   - For Bilal: `deploy-bilal-web /path/to/build.tgz`
