# Brgy Tanod S.O.S. — Deployment Checklist

## Pre-Deployment

- [ ] Run `./scripts/cleanup.sh`
- [ ] Update version in `package.json`
- [ ] Test offline SOS + map tiles
- [ ] Test Guardian AI model loading
- [ ] Verify Firestore Rules
- [ ] Test on real Android device (PWA + Capacitor)

## Firebase Deployment

```bash
firebase deploy --only hosting,functions,firestore:rules
```

## Vercel (Frontend Alternative)

```bash
vercel --prod
```

## Capacitor Android (Play Store)

```bash
npm run build
npx cap sync android
npx cap open android
```

## Post-Deployment

- [ ] Monitor Firebase Functions logs
- [ ] Test push notifications from another device
- [ ] Verify Tanod tracking on 2+ devices
- [ ] Share install link with Tanods

## Rollback Plan

```bash
firebase deploy --only hosting --message "Rollback"
```

**Last Tested**: May 23, 2026
