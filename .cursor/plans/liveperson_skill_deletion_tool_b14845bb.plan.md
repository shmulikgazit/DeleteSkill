---
name: LivePerson Skill Deletion Tool
overview: Build a Node.js CLI tool to identify and remove skill dependencies in LivePerson, enabling safe skill deletion by finding all entities (users, canned responses, engagements, widgets) that reference a specific skill.
todos:
  - id: setup-project
    content: Initialize Node.js project with dependencies (axios, dotenv, commander, cli-table3, chalk, json2csv)
    status: completed
  - id: api-client
    content: Build base API client with OAuth 2.0 authentication, token management, and Domain API integration
    status: completed
  - id: external-apis
    content: Implement Skills, Users, and Predefined Content API modules
    status: completed
  - id: dependency-finder
    content: Build dependency finder service to identify all entities using a skill
    status: completed
  - id: cli-interface
    content: Create CLI with commands for finding dependencies and exporting reports
    status: completed
  - id: capture-internal-apis
    content: Use browser DevTools to capture internal API endpoints for engagements and widgets
    status: completed
  - id: dependency-remover
    content: Build dependency remover service with dry-run, backup, and rollback capabilities
    status: completed
  - id: write-operations
    content: Implement update/delete operations for users, canned responses, and skill deletion
    status: completed
isProject: false
---

# LivePerson Skill Deletion Tool

## Platform Recommendation

**Node.js CLI Application** is the best choice for this project because:

- Provides excellent API integration capabilities with `axios` or `node-fetch`
- Easy to handle OAuth authentication and token management
- Can process large datasets efficiently with streaming
- Simple to output results in multiple formats (JSON, CSV, console tables)
- Can be extended to a web UI later if needed
- Works well on Windows with PowerShell

## Architecture Overview

```
liveperson-skill-cleaner/
├── src/
│   ├── api/
│   │   ├── client.js          # Base API client with OAuth
│   │   ├── domain.js           # Domain API calls
│   │   ├── skills.js           # Skills API
│   │   ├── users.js            # Users API
│   │   ├── predefinedContent.js # Predefined Content API
│   │   └── internal.js         # Placeholder for internal APIs
│   ├── services/
│   │   ├── dependencyFinder.js # Core logic to find dependencies
│   │   └── dependencyRemover.js # Phase 2: Remove dependencies
│   ├── utils/
│   │   ├── config.js           # Configuration management
│   │   ├── logger.js           # Logging utility
│   │   └── formatter.js        # Output formatting
│   └── index.js                # CLI entry point
├── config/
│   └── default.json            # Configuration template
├── package.json
└── README.md
```

## Available External APIs

Based on LivePerson Developer documentation at [https://developers.liveperson.com/](https://developers.liveperson.com/), the following APIs are available:

### 1. Domain API

- **Purpose**: Get base URIs for all LivePerson services
- **Endpoint**: `https://api.liveperson.net/api/account/{accountId}/service/{serviceName}/baseURI.json?version=1.0`
- **Service Names Needed**:
  - `accountConfigReadOnly` - For read operations
  - `accountConfigReadWrite` - For write operations

### 2. Skills API

- **Methods**:
  - `GET` - Get all skills
  - `GET` - Get skill by ID
  - `DELETE` - Delete skill(s)
- **Base Domain**: Retrieved via Domain API with service name `accountConfigReadOnly`

### 3. Users API

- **Methods**:
  - `GET /api/account/{accountId}/configuration/le-users/users` - Get all users
  - Returns user objects with `skillIds` array field
- **Key Field**: `skillIds` (array of longs)
- **Base Domain**: Retrieved via Domain API

### 4. Predefined Content API (Canned Responses)

- **Methods**:
  - `GET` - Get predefined content items
  - Returns items with `skillIds` array field
- **Key Field**: `skillIds` (array of longs) 
- **Base Domain**: Retrieved via Domain API

### 5. Authentication

- **OAuth 2.0 Client Credentials** (recommended)
- **OAuth 1.0 API Keys** (legacy)
- You indicated you already have credentials ready

## Internal APIs (UI-Based)

The following entities are **NOT** available via documented external APIs and will need to be captured from the browser:

### 1. Engagements

- Navigate to: Conversational Cloud UI > Engagement Studio
- Use Browser DevTools > Network tab
- Look for API calls when loading engagements
- Capture the endpoint, headers, and response format

### 2. Widgets

- Navigate to: Conversational Cloud UI > Widgets section
- Use Browser DevTools > Network tab
- Capture widget API endpoints

**Guidance for capturing internal APIs**:

1. Open Chrome/Edge DevTools (F12)
2. Go to Network tab
3. Filter by XHR/Fetch
4. Navigate to the relevant UI section
5. Look for API calls that return engagement/widget data
6. Right-click > Copy > Copy as cURL (bash)
7. Document the endpoint, headers (especially authorization), and response structure

## Phase 1: Dependency Identification (Read-Only)

### Implementation Steps

#### Step 1: Project Setup

Create a new Node.js project with the following dependencies:

- `axios` - HTTP client for API calls
- `dotenv` - Environment variable management
- `commander` - CLI argument parsing
- `cli-table3` - Pretty console tables
- `chalk` - Colored console output
- `json2csv` - CSV export functionality

#### Step 2: Configuration Management

Create `config/default.json`:

```json
{
  "liveperson": {
    "accountId": "",
    "oauth": {
      "clientId": "",
      "clientSecret": "",
      "tokenEndpoint": ""
    }
  }
}
```

Create `.env` file for sensitive credentials (not committed to git).

#### Step 3: API Client Foundation

Build `src/api/client.js`:

- OAuth token management (fetch, cache, refresh)
- Base HTTP client with retry logic
- Error handling and logging
- Rate limiting to respect API limits

Build `src/api/domain.js`:

- Function to fetch base URI for any service name
- Cache domain lookups to minimize API calls

#### Step 4: Implement External API Modules

`**src/api/skills.js**`:

- `getAllSkills()` - Fetch all skills
- `getSkillById(skillId)` - Get specific skill details

`**src/api/users.js**`:

- `getAllUsers()` - Fetch all users with pagination support
- Filter users where `skillIds` array contains target skill

`**src/api/predefinedContent.js**`:

- `getAllPredefinedContent()` - Fetch all canned responses
- Filter items where `skillIds` array contains target skill

`**src/api/internal.js**` (placeholder):

- Document structure for engagements and widgets
- Add TODO comments for manual API endpoint configuration
- Provide helper functions once endpoints are discovered

#### Step 5: Dependency Finder Service

Build `src/services/dependencyFinder.js`:

```javascript
async function findSkillDependencies(skillId) {
  return {
    skillId,
    skillName,
    users: [...],           // Users with this skill
    cannedResponses: [...], // Predefined content with this skill
    engagements: [...],     // Engagements with this skill (Phase 1: manual)
    widgets: [...]          // Widgets with this skill (Phase 1: manual)
  };
}
```

#### Step 6: CLI Interface

Build `src/index.js` with commands:

```bash
# Find dependencies for a skill
node src/index.js find --skill-id 12345

# Export results to CSV
node src/index.js find --skill-id 12345 --output report.csv

# Find dependencies for multiple skills
node src/index.js find --skill-ids 12345,67890

# List all skills
node src/index.js list-skills
```

#### Step 7: Output Formatting

Build `src/utils/formatter.js`:

- Console table output with color coding
- JSON export
- CSV export with all dependency details
- Summary statistics (total dependencies by type)

### Phase 1 Deliverables

1. **Dependency Report** showing:
  - Skill ID and Name
  - Count of users assigned to skill
  - List of user IDs and names
  - Count of canned responses using skill
  - List of canned response IDs and titles
  - Placeholders for engagements and widgets (to be filled manually)
2. **CSV Export** for easy sharing with stakeholders
3. **Documentation** on:
  - How to set up OAuth credentials
  - How to capture internal API endpoints from browser
  - How to run the tool

## Phase 2: Dependency Removal (Write Operations)

### Implementation Steps

#### Step 1: Extend API Modules with Write Operations

`**src/api/users.js`**:

- `updateUser(userId, userData)` - Update user to remove skill from `skillIds` array
- Batch update support for multiple users

`**src/api/predefinedContent.js**`:

- `updatePredefinedContent(itemId, itemData)` - Remove skill from `skillIds` array
- Batch update support

`**src/api/skills.js**`:

- `deleteSkill(skillId)` - Delete the skill after dependencies are removed

#### Step 2: Dependency Remover Service

Build `src/services/dependencyRemover.js`:

```javascript
async function removeSkillDependencies(skillId, options) {
  // Options: { dryRun, entities: ['users', 'cannedResponses'] }
  
  // 1. Find all dependencies
  // 2. For each entity type:
  //    - Remove skill from entity
  //    - Log changes
  //    - Handle errors gracefully
  // 3. Return summary of changes
}
```

#### Step 3: Safety Features

- **Dry-run mode**: Show what would be changed without making changes
- **Backup**: Export current state before making changes
- **Confirmation prompts**: Require explicit confirmation for destructive operations
- **Rollback capability**: Save original state to allow rollback
- **Incremental removal**: Remove dependencies one entity type at a time

#### Step 4: Extended CLI Commands

```bash
# Dry-run: show what would be removed
node src/index.js remove --skill-id 12345 --dry-run

# Remove skill from users only
node src/index.js remove --skill-id 12345 --entities users

# Remove skill from all entities and delete skill
node src/index.js remove --skill-id 12345 --entities all --delete-skill

# Create backup before removal
node src/index.js backup --skill-id 12345 --output backup.json

# Rollback changes
node src/index.js rollback --backup backup.json
```

#### Step 5: Internal API Integration

Once you've captured the internal API endpoints:

- Add engagement update/delete functions to `src/api/internal.js`
- Add widget update/delete functions
- Test thoroughly in a non-production environment first

### Phase 2 Deliverables

1. **Automated dependency removal** for:
  - Users (remove skill from `skillIds` array)
  - Canned responses (remove skill from `skillIds` array)
  - Engagements (once internal API is documented)
  - Widgets (once internal API is documented)
2. **Safety features**:
  - Dry-run mode
  - Backup and rollback
  - Detailed change logs
3. **Final skill deletion** after all dependencies are removed

## Authentication Setup

Since you have OAuth credentials, you'll need to configure:

1. **OAuth 2.0 Client Credentials**:
  - Client ID
  - Client Secret
  - Token endpoint (typically via Domain API with service name for authentication)
2. **Environment Variables** (`.env`):

```
   LP_ACCOUNT_ID=your_account_id
   LP_CLIENT_ID=your_client_id
   LP_CLIENT_SECRET=your_client_secret
   

```

1. **Token Management**:
  - Fetch access token using client credentials
  - Cache token until expiration
  - Auto-refresh when expired
  - Include token in all API requests as `Authorization: Bearer {token}`

## Testing Strategy

1. **Phase 1 Testing**:
  - Test with a skill that has known dependencies
  - Verify all dependencies are found
  - Test with skill that has no dependencies
  - Test with invalid skill ID
2. **Phase 2 Testing**:
  - **CRITICAL**: Test in a non-production/sandbox environment first
  - Start with dry-run mode
  - Test removing dependencies from one user
  - Test batch removal
  - Test rollback functionality
  - Only proceed to production after thorough testing

## Next Steps

1. **Immediate**: Set up Node.js project structure
2. **Phase 1 Focus**: Build read-only dependency finder
3. **Parallel Task**: Capture internal API endpoints for engagements and widgets
4. **Phase 2**: Add write operations with safety features
5. **Future Enhancement**: Build web UI if needed

## Key Files to Create

1. `package.json` - Dependencies and scripts
2. `src/api/client.js` - Base API client
3. `src/api/domain.js` - Domain API integration
4. `src/api/skills.js` - Skills API
5. `src/api/users.js` - Users API
6. `src/api/predefinedContent.js` - Predefined Content API
7. `src/services/dependencyFinder.js` - Core Phase 1 logic
8. `src/index.js` - CLI entry point
9. `.env.example` - Environment variable template
10. `README.md` - Setup and usage documentation

## Important Notes

- **Rate Limiting**: LivePerson APIs have rate limits. Implement exponential backoff and respect retry-after headers.
- **Pagination**: Users and predefined content APIs may return paginated results. Handle pagination properly.
- **Error Handling**: Some entities may fail to update. Log errors and continue processing others.
- **Audit Trail**: Keep detailed logs of all changes for compliance and troubleshooting.
- **Windows Compatibility**: Ensure all file paths use `path.join()` for cross-platform compatibility.

