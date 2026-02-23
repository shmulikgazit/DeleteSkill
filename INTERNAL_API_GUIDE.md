# Capturing Internal APIs for Engagements and Widgets

This guide explains how to capture internal LivePerson API endpoints that are not publicly documented.

## Why This Is Needed

LivePerson's public API documentation doesn't include endpoints for:
- **Engagements** (campaigns, engagement configurations)
- **Widgets** (chat widgets, engagement window configurations)

These can only be accessed through internal APIs that the Conversational Cloud UI uses.

## Tools You'll Need

- **Chrome** or **Edge** browser (recommended)
- Access to your LivePerson Conversational Cloud account
- Basic understanding of browser DevTools

## Step-by-Step: Capturing Engagements API

### 1. Open DevTools

1. Log in to your LivePerson Conversational Cloud account
2. Press **F12** to open DevTools (or right-click > Inspect)
3. Click on the **Network** tab

### 2. Filter Network Requests

1. In the Network tab, click the **XHR** button to show only API calls
2. Alternatively, type "api" or "engagement" in the filter box

### 3. Navigate to Engagements

1. In the LivePerson UI, go to **Engagement Studio** or **Campaign Builder**
2. Navigate to view your engagements/campaigns

### 4. Find the API Call

Look for API requests in the Network tab that:
- Have URLs containing "engagement", "campaign", or similar terms
- Return JSON data with engagement objects
- Have a status code of 200 (successful)

Common patterns to look for:
- `/api/account/{accountId}/configuration/engagement/...`
- `/api/account/{accountId}/campaigns/...`
- Any URL that returns a list of engagements

### 5. Inspect the Request

Click on the API request to see details:

**Headers tab**:
- Note the **Request URL** (full URL)
- Note the **Request Method** (GET, POST, etc.)
- Note the **Authorization** header (should be Bearer token)

**Response tab**:
- Look at the JSON structure
- Identify where skill IDs appear in the response
- Common field names: `skillId`, `skillIds`, `targetSkill`, `routingSkill`

### 6. Copy the Request

Right-click on the request > **Copy** > **Copy as cURL (bash)**

This gives you the complete request including headers.

### 7. Document Your Findings

Create a file `CAPTURED_APIS.md` with:

```markdown
## Engagements API

**Endpoint**: https://[domain]/api/account/[accountId]/configuration/engagement/engagements
**Method**: GET
**Headers**:
- Authorization: Bearer {token}
- Content-Type: application/json

**Response Structure**:
```json
[
  {
    "id": 12345,
    "name": "Engagement Name",
    "skillId": 67890,
    ...
  }
]
```

**Skill Field**: `skillId` (or document the actual field name)
```

## Step-by-Step: Capturing Widgets API

Follow the same process as above, but:

1. Navigate to the **Widgets** section in Conversational Cloud
2. Look for API calls that load widget configurations
3. Document the endpoint and structure

Common patterns:
- `/api/account/{accountId}/configuration/engagement-window/...`
- `/api/account/{accountId}/widgets/...`

## Example: What You're Looking For

Here's an example of what a captured API call might look like:

### Request
```
GET https://va.ac.liveperson.net/api/account/12345678/configuration/le-campaigns/campaigns?v=3.0
Authorization: Bearer eyJhbGc...
```

### Response
```json
[
  {
    "id": 111111,
    "name": "Sales Campaign",
    "skillId": 12345,
    "enabled": true,
    ...
  },
  {
    "id": 222222,
    "name": "Support Campaign",
    "skillId": 67890,
    "enabled": true,
    ...
  }
]
```

In this example:
- **Endpoint**: `/api/account/{accountId}/configuration/le-campaigns/campaigns`
- **Skill field**: `skillId`
- **Domain**: `va.ac.liveperson.net` (this varies by account)

## Integrating Captured APIs

Once you've captured the API details, you can extend `src/api/internal.js`:

### Example Integration

```javascript
// In src/api/internal.js

async getAllEngagements() {
  try {
    logger.info('Fetching engagements from internal API...');
    
    // Use the captured endpoint
    const domain = await domainApi.getReadOnlyDomain();
    const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-campaigns/campaigns?v=3.0`;
    
    const data = await apiClient.get(url);
    
    logger.success(`Retrieved ${data.length} engagements`);
    return data;
  } catch (error) {
    logger.error('Failed to fetch engagements:', error.message);
    return [];
  }
}

async getEngagementsBySkillId(skillId) {
  try {
    logger.info(`Finding engagements with skill ID: ${skillId}...`);
    
    const allEngagements = await this.getAllEngagements();
    
    // Filter by the skill field you identified
    const engagementsWithSkill = allEngagements.filter(eng => 
      eng.skillId === Number(skillId) // Adjust field name as needed
    );
    
    logger.success(`Found ${engagementsWithSkill.length} engagements with skill ${skillId}`);
    return engagementsWithSkill;
  } catch (error) {
    logger.error('Failed to filter engagements by skill:', error.message);
    return [];
  }
}
```

## Tips for Success

1. **Clear your Network tab** before navigating to avoid clutter
2. **Refresh the page** to see all API calls from scratch
3. **Look for pagination**: Some APIs return paginated results
4. **Check query parameters**: Some endpoints use query params to filter results
5. **Test the endpoint**: Try calling it with your OAuth token to verify it works

## Common Field Names for Skills

When examining API responses, look for these field names:
- `skillId` (single skill)
- `skillIds` (array of skills)
- `targetSkill`
- `routingSkill`
- `assignedSkills`
- `skill`

## Security Note

- Never share your captured API calls publicly (they contain your account ID)
- Never commit your `.env` file to version control
- Keep your OAuth credentials secure

## Need Help?

If you're having trouble capturing the APIs:
1. Make sure you're logged in to LivePerson
2. Try different sections of the UI (Campaigns, Engagement Studio, etc.)
3. Look for any API call that returns a list of items
4. Check the Response tab to see if it contains skill references

## Alternative: Manual Process

If you cannot capture the internal APIs, you can still use this tool for users and canned responses, then:
1. Manually check engagements in the UI
2. Manually remove the skill from any engagements
3. Manually check widgets in the UI
4. Manually remove the skill from any widgets
5. Use the tool to delete the skill once all dependencies are removed

The tool will warn you about engagements and widgets that need manual attention.
