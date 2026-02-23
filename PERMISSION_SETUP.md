# Setting Up OAuth Permissions

## Current Issue

You're seeing this error:
```
The operation encountered a privilege error
```

This means your OAuth 2.0 application doesn't have permission to access the Skills API.

## Solution: Grant API Permissions

### Step 1: Log into LivePerson

1. Go to your LivePerson Conversational Cloud account
2. Log in with **Administrator** credentials

### Step 2: Navigate to Application Management

1. Click on the **Manage** area (bottom left icon)
2. Go to **Management Console**
3. Type **"Application Install"** in the search bar
4. Click **"Proceed to Configure"**

### Step 3: Find Your OAuth Application

You should see your application in the list:
- **Client ID**: `7753c6bd-54ec-4125-a7dd-7ab1d99095fa`

Click **"Edit"** on this application.

### Step 4: Grant Required Permissions

In the application configuration, you need to enable the following API scopes:

**Required for Phase 1 (Read-Only)**:
- ✅ **Skills** - Read access
- ✅ **Users** - Read access
- ✅ **Predefined Content** - Read access

**Required for Phase 2 (Write Operations)**:
- ✅ **Skills** - Write/Delete access
- ✅ **Users** - Write access
- ✅ **Predefined Content** - Write access

### Step 5: Save Changes

1. Click **"Save"** to apply the permissions
2. Wait a few minutes for the changes to propagate
3. Test again with: `node src/index.js list-skills`

## Alternative: Create a New OAuth Application

If you can't edit the existing application, create a new one:

### 1. Create Application

1. In Application Install section, click **"Create Application"**
2. Fill in the details:
   - **Application Name**: LivePerson Skill Cleaner
   - **Description**: Tool to identify and remove skill dependencies
   - **Grant Type**: Select **Client Credentials**

### 2. Select API Scopes

Check the boxes for:
- **Skills API** (Read and Write)
- **Users API** (Read and Write)
- **Predefined Content API** (Read and Write)

### 3. Save and Get Credentials

1. Click **"Save"**
2. You'll be redirected to the application list
3. Click **"Edit"** on your new application
4. Copy the **Client ID** and **Client Secret**
5. Update your `.env` file with the new credentials

## Testing Permissions

After granting permissions, test each API:

### Test Skills API (Read)
```powershell
node src/index.js list-skills
```

If this works, you'll see a list of all skills.

### Test Finding Dependencies (Read)
```powershell
node src/index.js find -s SKILL_ID
```

Replace `SKILL_ID` with an actual skill ID from your list.

### Test Removal (Write) - Dry Run
```powershell
node src/index.js remove -s SKILL_ID --dry-run
```

This tests write permissions without making actual changes.

## Common Permission Issues

### "The operation encountered a privilege error"

**Problem**: OAuth application doesn't have the required API scope.

**Solution**: Edit the application in LivePerson and grant the necessary permissions.

### "unauthorized_client"

**Problem**: Client ID or Client Secret is incorrect.

**Solution**: 
1. Verify credentials in `.env` file
2. Re-copy from LivePerson UI (Edit application)
3. Make sure there are no extra spaces

### "Forbidden" after granting permissions

**Problem**: Changes haven't propagated yet.

**Solution**: Wait 2-5 minutes and try again.

## Required API Scopes Reference

| API | Scope Name | Phase 1 | Phase 2 |
|-----|------------|---------|---------|
| Skills API | skills:read | ✅ Required | ✅ Required |
| Skills API | skills:write | ❌ Not needed | ✅ Required |
| Users API | users:read | ✅ Required | ✅ Required |
| Users API | users:write | ❌ Not needed | ✅ Required |
| Predefined Content API | content:read | ✅ Required | ✅ Required |
| Predefined Content API | content:write | ❌ Not needed | ✅ Required |

Note: The exact scope names may vary in the LivePerson UI. Look for checkboxes or toggles for each API.

## Verification Checklist

After setting up permissions:

- [ ] OAuth application exists in LivePerson
- [ ] Client ID and Secret are correct in `.env`
- [ ] Skills API - Read permission granted
- [ ] Users API - Read permission granted
- [ ] Predefined Content API - Read permission granted
- [ ] Waited 2-5 minutes after granting permissions
- [ ] Tested with `node src/index.js list-skills`
- [ ] Successfully see list of skills

## Next Steps

Once permissions are working:

1. **Phase 1**: Use read-only commands
   - List skills
   - Find dependencies
   - Export reports

2. **Phase 2**: Grant write permissions when ready
   - Remove dependencies
   - Delete skills

## Need Help?

If you're still having permission issues:
1. Contact your LivePerson account administrator
2. Verify your user account has permission to create/edit OAuth applications
3. Check LivePerson documentation: https://developers.liveperson.com/oauth-2-0-client-credentials.html
4. Contact LivePerson support for assistance with OAuth setup
