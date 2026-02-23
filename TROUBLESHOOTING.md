# Troubleshooting Guide

Common issues and their solutions.

## Installation Issues

### "npm: command not found" or "node: command not found"

**Problem**: Node.js is not installed or not in PATH.

**Solution**:
1. Download and install Node.js from https://nodejs.org/
2. Restart PowerShell after installation
3. Verify with: `node --version`

### "Cannot find module" errors

**Problem**: Dependencies not installed.

**Solution**:
```powershell
npm install
```

## Configuration Issues

### "Missing required environment variables"

**Problem**: `.env` file is missing or incomplete.

**Solution**:
1. Copy the example file:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Edit `.env` and add your credentials
3. Make sure all three variables are set:
   - `LP_ACCOUNT_ID`
   - `LP_CLIENT_ID`
   - `LP_CLIENT_SECRET`

### "Cannot read config file"

**Problem**: `config/default.json` is missing or corrupted.

**Solution**: The file should have been created during setup. If missing, check the project structure.

## Authentication Issues

### "Authentication failed"

**Possible Causes**:
1. Incorrect credentials in `.env`
2. OAuth client doesn't have necessary permissions
3. Account ID is wrong
4. Client ID or Secret is wrong

**Solutions**:
1. Double-check your credentials in `.env`
2. Verify your OAuth client in LivePerson UI
3. Ensure the API user has these permissions:
   - Read access to Skills
   - Read access to Users
   - Read access to Predefined Content
   - Write access (for Phase 2 operations)

### "Invalid or expired token"

**Problem**: Access token expired during operation.

**Solution**: The tool should automatically refresh the token. If it doesn't:
1. Check your OAuth credentials
2. Restart the tool
3. Check LivePerson service status

### "401 Unauthorized"

**Problem**: Token is invalid or missing permissions.

**Solution**:
1. Verify OAuth credentials are correct
2. Check that the API user has the required permissions in LivePerson
3. Try re-generating your OAuth credentials

### "403 Forbidden" or "The operation encountered a privilege error"

**Problem**: OAuth application doesn't have the required API permissions.

**Solution**: 
1. Log into LivePerson Conversational Cloud as Administrator
2. Go to **Manage** > **Management Console** > **Application Install**
3. Find your OAuth application and click **"Edit"**
4. Grant permissions for Skills API, Users API, and Predefined Content API
5. Save and wait 2-5 minutes for changes to propagate
6. See `PERMISSION_SETUP.md` for detailed step-by-step instructions

## API Issues

### "Failed to retrieve base URI for service"

**Problem**: Domain API lookup failed.

**Possible Causes**:
1. Network connectivity issue
2. Invalid account ID
3. Service name is incorrect

**Solutions**:
1. Check your internet connection
2. Verify `LP_ACCOUNT_ID` in `.env` is correct
3. Check LivePerson service status

### "Skill with ID X not found"

**Problem**: The skill ID doesn't exist.

**Solution**:
1. List all skills to find the correct ID:
   ```powershell
   node src/index.js list-skills
   ```
2. Verify you're using the correct account
3. Check if the skill was already deleted

### "User with ID X not found"

**Problem**: User doesn't exist or was deleted.

**Solution**: This can happen if a user was deleted between finding dependencies and removing them. The tool will continue processing other users.

### "Failed to fetch users" or "Failed to fetch predefined content"

**Possible Causes**:
1. API endpoint changed
2. API version is outdated
3. Network timeout
4. Rate limiting

**Solutions**:
1. Check LivePerson Developer documentation for API changes
2. Increase timeout in `src/api/client.js`
3. Wait a few minutes and retry (rate limiting)
4. Check network connectivity

## Dependency Removal Issues

### "Skill still cannot be deleted after removal"

**Problem**: Some dependencies remain.

**Solutions**:
1. Run `find` again to see remaining dependencies:
   ```powershell
   node src/index.js find -s 12345
   ```
2. Check for engagements and widgets manually in the UI
3. Look for other entity types not covered by the tool
4. Contact LivePerson support if the issue persists

### "Failed to update user" or "Failed to update predefined content"

**Possible Causes**:
1. User or item is locked
2. Insufficient permissions
3. Concurrent modification
4. Required fields missing

**Solutions**:
1. Check the error message for specific details
2. Verify your API user has write permissions
3. Try updating the item manually in the UI
4. Check if the user/item is locked by another process

### "Batch update complete: X succeeded, Y failed"

**Problem**: Some items failed to update.

**Solution**: This is normal. The tool continues processing even if some items fail. 
1. Check the logs for specific error messages
2. Note which items failed
3. Try updating them manually in the UI
4. Re-run the command to process any remaining items

## Performance Issues

### "Tool is very slow"

**Possible Causes**:
1. Large number of users or predefined content items
2. Network latency
3. API rate limiting

**Solutions**:
1. This is expected for large accounts (hundreds of users)
2. The tool processes items sequentially to avoid rate limits
3. Be patient - it will complete eventually
4. Consider processing during off-peak hours

### "Timeout errors"

**Problem**: API requests timing out.

**Solution**:
1. Check your network connection
2. Increase timeout in `src/api/client.js` (default is 30 seconds)
3. Check LivePerson service status

## Output Issues

### "Cannot write to file"

**Problem**: Permission denied or directory doesn't exist.

**Solutions**:
1. Run PowerShell as Administrator
2. Check that you have write permissions in the project folder
3. The tool creates `reports/` and `backups/` directories automatically

### "CSV export is empty"

**Problem**: No dependencies were found.

**Solution**: This is correct behavior. The CSV will contain a single row indicating no dependencies were found.

## Engagements and Widgets

### "Engagements API is internal and must be captured"

**Problem**: Engagements are not accessible via public API.

**Solution**:
1. See `INTERNAL_API_GUIDE.md` for instructions on capturing the API
2. Or handle engagements manually in the UI
3. The tool will warn you if engagements are found

### "Widgets API is internal and must be captured"

**Problem**: Widgets are not accessible via public API.

**Solution**: Same as engagements above.

## Windows-Specific Issues

### "Path not found" errors

**Problem**: Windows path format issues.

**Solution**: The tool uses Node.js `path` module which handles Windows paths correctly. If you see path errors:
1. Make sure you're in the correct directory
2. Use forward slashes or double backslashes in paths
3. Avoid spaces in file paths

### PowerShell execution policy

**Problem**: "Scripts are disabled on this system"

**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Getting More Help

### Enable Debug Logging

To see detailed logs, modify `src/utils/logger.js`:

```javascript
// Change this line:
export const logger = new Logger('DEBUG');
```

Then run your command again to see detailed debug output.

### Check the Logs

The tool outputs detailed logs to the console. Look for:
- `[ERROR]` messages for failures
- `[WARN]` messages for potential issues
- `[DEBUG]` messages for detailed operation info (if debug logging enabled)

### Test Individual Components

Test each API separately:

```powershell
# Test Skills API
node src/index.js list-skills

# Test finding dependencies
node src/index.js find -s 12345

# Test with dry run (no changes made)
node src/index.js remove -s 12345 --dry-run
```

### Check LivePerson Service Status

If multiple API calls are failing:
1. Check LivePerson service status
2. Verify your account is active
3. Contact LivePerson support

### Manual Verification

After running the tool, verify in the LivePerson UI:
1. Check that users no longer have the skill assigned
2. Check that canned responses no longer reference the skill
3. Try deleting the skill manually in the UI

## Contact Support

If you're still having issues:

1. **Check the documentation**:
   - `README.md` - Complete documentation
   - `GET_STARTED.md` - Setup instructions
   - `EXAMPLE_USAGE.md` - Usage examples
   - `API_REFERENCE.md` - API details

2. **LivePerson Support**:
   - Visit: https://developers.liveperson.com/
   - Contact LivePerson technical support
   - Check LivePerson community forums

3. **Common Issues**:
   - Most issues are related to authentication or permissions
   - Verify your OAuth credentials and API user permissions
   - Test with a simple command first (`list-skills`)

## Debug Checklist

When troubleshooting, go through this checklist:

- [ ] Node.js is installed (version 18+)
- [ ] Dependencies are installed (`npm install`)
- [ ] `.env` file exists and has all three variables
- [ ] Credentials in `.env` are correct
- [ ] Account ID is correct
- [ ] OAuth client has necessary permissions
- [ ] Network connection is working
- [ ] Can list skills successfully
- [ ] Skill ID is correct and exists
- [ ] Using correct command syntax

If all items are checked and it still doesn't work, there may be an issue with the LivePerson API or your account configuration.
