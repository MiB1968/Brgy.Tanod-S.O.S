# 🚀 Firebase Migration Quickstart

Your new Firebase project is ready: **brgy-tanod-sos**

## ✅ What's Already Done

- ✅ New Firebase project created: `brgy-tanod-sos`
- ✅ Authentication enabled (Email/Password + Google)
- ✅ Firestore Database created
- ✅ Cloud Messaging enabled
- ✅ `firebase-applet-config.json` updated with new credentials

## 📋 Next Steps

### Step 1: Get the Old Project's Service Account

You need to export data from the old shared project first.

1. Go to: https://console.firebase.google.com/project/gen-lang-client-0433922302/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. Save as: `firebase-service-account-old.json` in the root directory

### Step 2: Get Your New Project's Service Account

1. Go to: https://console.firebase.google.com/project/brgy-tanod-sos/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. Save as: `firebase-service-account.json` in the root directory

### Step 3: Run the Migration

```bash
# Export data from old project
node scripts/firebase-migration.js export

# This creates: firebase-exports/firebase-backup-TIMESTAMP.json
# This shows you what will be migrated
```

### Step 4: Temporary Security Setup

For the import to work, temporarily update your **Firestore Security Rules**:

1. Go to: https://console.firebase.google.com/project/brgy-tanod-sos/firestore/rules
2. Replace rules with:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"**

### Step 5: Import Data

```bash
# Import to new project
node scripts/firebase-migration.js import firebase-exports/firebase-backup-*.json
```

### Step 6: Restore Security Rules

After import succeeds, update your rules back to:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own documents
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId || isAdmin(request.auth.uid);
    }
    
    // Admins can do anything
    match /{document=**} {
      allow read, write: if isAdmin(request.auth.uid);
    }
    
    function isAdmin(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.role in ['admin', 'superadmin'];
    }
  }
}
```

### Step 7: Test Login

Try logging in:
- **Email**: `resident@brgytanod.com`
- **Password**: `tanod123`

## 📊 What Gets Migrated

All of these collections (if they exist):
- `users` - User accounts
- `residents` - Resident profiles  
- `patrols` - Patrol data
- `sos_alerts` - Emergency alerts
- `barangays` - Barangay info
- `incidents` - Incident records
- `chats` - Chat messages
- `audit_logs` - Audit trail
- Any other collections in your database

## ⚠️ Important Notes

1. **Backup**: The export file is saved in `firebase-exports/` - keep it safe!
2. **Time**: Migration can take several minutes depending on data size
3. **Cost**: Firestore operations will count towards your usage quota
4. **Rate Limits**: If you hit rate limits, adjust `MIGRATION_BATCH_SIZE` in `.env.migration`

## 🆘 Troubleshooting

### "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### "Permission denied" during import
- Check that Firestore Security Rules allow writes
- Make sure you set rules to `allow read, write: if true;` temporarily

### "Invalid service account"
- Verify the JSON file is valid and from the correct project
- Check file permissions

### Export creates empty file
- Verify you have collections in the old project
- Check that firebase-service-account-old.json is valid

## ✅ Verify Migration Success

After migration, check:
1. ✅ All collections imported to new project
2. ✅ Document counts match
3. ✅ Can login with test credentials
4. ✅ User data appears correctly
5. ✅ Can create new alerts/incidents

## 🎯 Final Steps

Once migration is successful:

1. Update environment variables in your deployment:
```bash
FIREBASE_PROJECT_ID=brgy-tanod-sos
VITE_FIREBASE_PROJECT_ID=brgy-tanod-sos
```

2. Redeploy your application

3. Test all features in production

## 📞 Need Help?

- Check `FIREBASE_MIGRATION.md` for detailed documentation
- Review Firebase Console logs for errors
- Check browser console for authentication errors

---

**Ready to migrate?** Start with Step 1! 🚀