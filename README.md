# LivePerson Skill Cleaner

A Node.js CLI tool to identify and remove skill dependencies in LivePerson, enabling safe skill deletion.

## Problem Statement

Deleting a skill in LivePerson can produce errors like:
> "skill cannot be deleted because it is assigned to the following entities: skills, cannedResponses, engagements, widgets, users"

This tool helps you identify all dependencies and systematically remove them.

## Features

### Phase 1: Dependency Identification ✅ (Tested)
- Find all users assigned to a skill
- Find all canned responses (predefined content) using a skill
- Find all skills that reference this skill (transfer list & fallback)
- Find all widgets using a skill
- Find all engagements using a skill (requires user login credentials)
- Export reports in JSON or CSV format with direct UI links
- List all skills in your account

### Phase 2: Dependency Removal ⚠️ (Coded but not fully tested yet)
- Remove skill from users automatically
- Remove skill from canned responses automatically
- Remove skill references from other skills automatically
- Remove skill from widgets automatically
- Remove skill from engagements automatically (requires user login credentials)
- Dry-run mode to preview changes
- Automatic backup before making changes
- Batch processing with error handling
- Optional skill deletion after cleanup

> **Note**: Phase 2 removal functionality is implemented but should be tested with `--dry-run` first in your environment before making actual changes.

## Prerequisites

1. **Node.js**: Version 18 or higher
2. **LivePerson OAuth 2.0 Credentials**: Required for users, skills, canned responses, and widgets
   - Client ID
   - Client Secret
   - Account ID
3. **LivePerson User Login Credentials** (Optional): Required only for campaigns/engagements
   - Username
   - Password

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```powershell
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```powershell
   Copy-Item .env.example .env
   ```

4. Edit `.env` and add your credentials:
   ```
   LP_ACCOUNT_ID=your_account_id
   LP_CLIENT_ID=your_oauth_client_id
   LP_CLIENT_SECRET=your_oauth_client_secret
   
   # Optional: For campaigns/engagements support
   LP_USERNAME=your_username
   LP_PASSWORD=your_password
   ```

## Getting OAuth Credentials

To obtain OAuth 2.0 credentials for LivePerson:

1. Log in to your LivePerson Conversational Cloud account
2. Navigate to the Campaign Builder or Contact Center Management
3. Go to Users section and create an API user with appropriate permissions
4. Generate OAuth 2.0 Client Credentials
5. Save the Client ID and Client Secret

For detailed instructions, visit: https://developers.liveperson.com/oauth-2-0-client-credentials.html

## Usage

### List All Skills

```powershell
node src/index.js list-skills
```

Export to JSON:
```powershell
node src/index.js list-skills -o skills.json
```

### Find Dependencies for a Skill

Find and display in a table:
```powershell
node src/index.js find -s 12345
```

Export to CSV:
```powershell
node src/index.js find -s 12345 -o report.csv
```

Export to JSON:
```powershell
node src/index.js find -s 12345 -o report.json
```

### Find Dependencies for Multiple Skills

```powershell
node src/index.js find-multiple -s 12345,67890,11111
```

### Remove Skill Dependencies

**Dry run** (preview changes without making them):
```powershell
node src/index.js remove -s 12345 --dry-run
```

**Remove from users only**:
```powershell
node src/index.js remove -s 12345 -e users
```

**Remove from canned responses only**:
```powershell
node src/index.js remove -s 12345 -e cannedResponses
```

**Remove from all entities**:
```powershell
node src/index.js remove -s 12345 -e all
```

**Remove from all entities and delete the skill**:
```powershell
node src/index.js remove -s 12345 -e all --delete-skill
```

**Remove without creating a backup** (not recommended):
```powershell
node src/index.js remove -s 12345 --no-backup
```

### Create a Backup

```powershell
node src/index.js backup -s 12345
```

Custom output path:
```powershell
node src/index.js backup -s 12345 -o my-backup.json
```

### Rollback Changes

```powershell
node src/index.js rollback -b backups/skill-12345-backup-2026-02-22.json
```

Note: Rollback functionality is currently limited. The backup file contains all original data for manual restoration if needed.

## Capturing Internal APIs (Engagements & Widgets)

Some LivePerson entities are not available via public APIs and require capturing internal API endpoints:

### For Engagements:

1. Open your LivePerson Conversational Cloud account
2. Navigate to **Engagement Studio**
3. Open Browser DevTools (press F12)
4. Go to the **Network** tab
5. Filter by **XHR** or **Fetch**
6. Refresh the page or navigate to view engagements
7. Look for API calls that return engagement data
8. Right-click on the request > **Copy** > **Copy as cURL (bash)**
9. Document the endpoint URL, headers, and response structure

### For Widgets:

1. Navigate to the **Widgets** section in Conversational Cloud
2. Follow the same DevTools process as above
3. Capture the API endpoint for widgets

Once captured, you can extend `src/api/internal.js` to integrate these endpoints.

## Project Structure

```
liveperson-skill-cleaner/
├── src/
│   ├── api/
│   │   ├── client.js              # Base API client with OAuth
│   │   ├── domain.js               # Domain API integration
│   │   ├── skills.js               # Skills API
│   │   ├── users.js                # Users API
│   │   ├── predefinedContent.js    # Predefined Content API
│   │   └── internal.js             # Placeholder for internal APIs
│   ├── services/
│   │   ├── dependencyFinder.js     # Find skill dependencies
│   │   └── dependencyRemover.js    # Remove dependencies
│   ├── utils/
│   │   ├── config.js               # Configuration management
│   │   ├── logger.js               # Logging utility
│   │   └── formatter.js            # Output formatting
│   └── index.js                    # CLI entry point
├── config/
│   └── default.json                # Default configuration
├── reports/                        # Generated reports (created automatically)
├── backups/                        # Backup files (created automatically)
├── .env                            # Your credentials (not in git)
├── .env.example                    # Template for .env
├── package.json
└── README.md
```

## API Reference

### External APIs Used

1. **Domain API**: Get base URIs for LivePerson services
   - Endpoint: `https://api.liveperson.net/api/account/{accountId}/service/{serviceName}/baseURI.json`

2. **Skills API**: Manage skills
   - Get all skills: `GET /configuration/le-users/skills`
   - Get skill by ID: `GET /configuration/le-users/skills/{skillId}`
   - Delete skill: `DELETE /configuration/le-users/skills/{skillId}`

3. **Users API**: Manage users
   - Get all users: `GET /configuration/le-users/users`
   - Update user: `PUT /configuration/le-users/users/{userId}`

4. **Predefined Content API**: Manage canned responses
   - Get all items: `GET /configuration/engagement-window/canned-responses`
   - Update item: `PUT /configuration/engagement-window/canned-responses/{itemId}`

### Internal APIs (Not Yet Implemented)

- **Engagements**: Requires manual capture from UI
- **Widgets**: Requires manual capture from UI

## Workflow

### Typical Workflow to Delete a Skill

1. **Identify dependencies**:
   ```powershell
   node src/index.js find -s 12345
   ```

2. **Create a backup**:
   ```powershell
   node src/index.js backup -s 12345
   ```

3. **Preview changes** (dry run):
   ```powershell
   node src/index.js remove -s 12345 --dry-run
   ```

4. **Remove dependencies**:
   ```powershell
   node src/index.js remove -s 12345 -e all
   ```

5. **Manually check engagements and widgets** in the UI (if any were found)

6. **Delete the skill**:
   ```powershell
   node src/index.js remove -s 12345 --delete-skill
   ```

   Or delete directly in the UI once all dependencies are removed.

## Safety Features

- **Dry-run mode**: Preview all changes before applying them
- **Automatic backups**: Creates timestamped backups before modifications
- **Confirmation delay**: 5-second warning before destructive operations
- **Error handling**: Continues processing even if individual items fail
- **Detailed logging**: All operations are logged with color-coded output

## Troubleshooting

### Authentication Errors

If you see authentication errors:
1. Verify your credentials in `.env` are correct
2. Ensure your OAuth client has the necessary permissions
3. Check that your account ID is correct

### Rate Limiting

The tool implements automatic retry with exponential backoff. If you hit rate limits frequently, the tool will automatically wait and retry.

### Skill Still Cannot Be Deleted

If the skill still cannot be deleted after running the tool:
1. Check for engagements and widgets manually in the UI
2. Look for any other dependencies not covered by the external APIs
3. Contact LivePerson support for assistance

## Important Notes

- **Test in non-production first**: Always test in a sandbox/development environment before using in production
- **Backup your data**: Always create backups before making changes
- **Review dry-run output**: Always run with `--dry-run` first to preview changes
- **API rate limits**: The tool respects LivePerson API rate limits and implements retry logic
- **Windows compatibility**: All file paths use Node.js `path` module for cross-platform compatibility

## Support

For issues with the tool, check the logs and error messages. For LivePerson API issues, refer to:
- [LivePerson Developer Center](https://developers.liveperson.com/)
- [Skills API Documentation](https://developers.liveperson.com/skills-api-overview.html)
- [Users API Documentation](https://developers.liveperson.com/users-api-overview.html)

## License

MIT
