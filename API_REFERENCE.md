# API Reference

Complete reference for all LivePerson APIs used in this tool.

## Authentication

All API calls require OAuth 2.0 Bearer token authentication.

### Getting an Access Token

**Endpoint**: Retrieved via Domain API (service: `sentinel`)

**Request**:
```http
POST https://{sentinel-domain}/sentinel/api/account/{accountId}/app/token
Content-Type: application/x-www-form-urlencoded

client_id={clientId}&client_secret={clientSecret}&grant_type=client_credentials
```

**Response**:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Usage**: Include in all API requests:
```
Authorization: Bearer {access_token}
```

## Domain API

Get base URIs for LivePerson services.

### Get Base URI

**Endpoint**: `https://api.liveperson.net/api/account/{accountId}/service/{serviceName}/baseURI.json?version=1.0`

**Method**: GET

**Authentication**: Not required

**Parameters**:
- `accountId` (path) - Your LivePerson account ID
- `serviceName` (path) - Service name (e.g., `accountConfigReadOnly`)
- `version` (query) - API version (use `1.0`)

**Response**:
```json
{
  "service": "accountConfigReadOnly",
  "account": "12345678",
  "baseURI": "va.ac.liveperson.net"
}
```

**Service Names**:
- `accountConfigReadOnly` - For read operations (Skills, Users, Predefined Content)
- `accountConfigReadWrite` - For write operations
- `sentinel` - For OAuth token endpoint

## Skills API

Manage skills in your LivePerson account.

### Get All Skills

**Endpoint**: `https://{domain}/api/account/{accountId}/configuration/le-users/skills?v=6.0`

**Method**: GET

**Authentication**: Required (Bearer token)

**Response**:
```json
[
  {
    "id": 12345,
    "name": "Sales Support",
    "description": "Handles sales inquiries",
    "deleted": false,
    "canTransfer": true,
    "maxWaitTime": 120,
    "defaultPostChatSurveyId": "123",
    "dateUpdated": "2026-02-20T10:30:00.000Z"
  }
]
```

### Get Skill by ID

**Endpoint**: `https://{domain}/api/account/{accountId}/configuration/le-users/skills/{skillId}?v=6.0`

**Method**: GET

**Authentication**: Required

**Response**: Single skill object (same structure as above)

### Delete Skill

**Endpoint**: `https://{domain}/api/account/{accountId}/configuration/le-users/skills/{skillId}?v=6.0`

**Method**: DELETE

**Authentication**: Required

**Response**: 200 OK if successful

**Error Response** (if dependencies exist):
```json
{
  "type": "skill-dependencies",
  "message": "skill cannot be deleted because it is assigned to the following entities: skills, cannedResponses, engagements, widgets, users"
}
```

## Users API

Manage users and their skill assignments.

### Get All Users

**Endpoint**: `https://{domain}/api/account/{accountId}/configuration/le-users/users?v=6.0`

**Method**: GET

**Authentication**: Required

**Query Parameters**:
- `v` (required) - API version (use `6.0`)
- `select` (optional) - Field filter (e.g., `id,name,skillIds`)

**Response**:
```json
[
  {
    "id": 1001,
    "loginName": "john.doe",
    "email": "john.doe@company.com",
    "nickname": "John",
    "name": "John Doe",
    "isEnabled": true,
    "isApiUser": false,
    "maxChats": 3,
    "skillIds": [12345, 67890],
    "profileIds": [1, 2],
    "memberOf": {
      "agentGroupId": 100,
      "assignmentDate": "2025-01-15T08:00:00.000Z"
    }
  }
]
```

**Key Field**: `skillIds` - Array of skill IDs assigned to this user

### Get User by ID

**Endpoint**: `https://{domain}/api/account/{accountId}/configuration/le-users/users/{userId}?v=6.0`

**Method**: GET

**Authentication**: Required

**Response**: Single user object (same structure as above)

### Update User

**Endpoint**: `https://{domain}/api/account/{accountId}/configuration/le-users/users/{userId}?v=6.0`

**Method**: PUT

**Authentication**: Required

**Request Body**: Complete user object with modifications

**Important Notes**:
- Must include ALL user fields in the request body
- Missing fields will be deleted
- To remove a skill, update the `skillIds` array without that skill ID

**Example Request**:
```json
{
  "id": 1001,
  "loginName": "john.doe",
  "email": "john.doe@company.com",
  "nickname": "John",
  "name": "John Doe",
  "isEnabled": true,
  "maxChats": 3,
  "skillIds": [67890],
  "profileIds": [1, 2],
  "memberOf": {
    "agentGroupId": 100
  }
}
```

## Predefined Content API

Manage canned responses (predefined content).

### Get All Predefined Content

**Endpoint**: `https://{domain}/api/account/{accountId}/configuration/engagement-window/canned-responses?v=2.0`

**Method**: GET

**Authentication**: Required

**Response**:
```json
[
  {
    "id": 5001,
    "deleted": false,
    "enabled": true,
    "type": 0,
    "data": [
      {
        "msg": "Hello! How can I help you today?",
        "lang": "en-us",
        "title": "Welcome Message",
        "isDefault": false
      }
    ],
    "categoriesIds": [234, 567],
    "skillIds": [12345, 67890],
    "lobIds": [10, 11]
  }
]
```

**Key Field**: `skillIds` - Array of skill IDs assigned to this content

### Get Predefined Content by ID

**Endpoint**: `https://{domain}/api/account/{accountId}/configuration/engagement-window/canned-responses/{itemId}?v=2.0`

**Method**: GET

**Authentication**: Required

**Response**: Single predefined content object (same structure as above)

### Update Predefined Content

**Endpoint**: `https://{domain}/api/account/{accountId}/configuration/engagement-window/canned-responses/{itemId}?v=2.0`

**Method**: PUT

**Authentication**: Required

**Request Body**: Complete predefined content object with modifications

**Important Notes**:
- Must include ALL fields in the request body
- Missing fields will be deleted
- To remove a skill, update the `skillIds` array without that skill ID

## Error Responses

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "error_description": "Invalid or expired token"
}
```

**Solution**: Token expired, re-authenticate

### 403 Forbidden
```json
{
  "error": "forbidden",
  "error_description": "Insufficient permissions"
}
```

**Solution**: API user needs additional permissions

### 404 Not Found
```json
{
  "error": "not_found",
  "error_description": "Resource not found"
}
```

**Solution**: Invalid ID or resource doesn't exist

### 429 Too Many Requests
```json
{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests"
}
```

**Headers**: `Retry-After: 5` (seconds to wait)

**Solution**: Tool automatically retries after delay

### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "error_description": "An internal error occurred"
}
```

**Solution**: Retry the request, contact LivePerson support if persistent

## Rate Limits

LivePerson APIs have rate limits:
- Typically 10-20 requests per second per account
- Varies by API and account tier
- Tool implements automatic retry with exponential backoff

## Pagination

Some APIs return paginated results. Check response headers:
- `Link` header may contain pagination links
- Response may include `next` or `offset` fields

The tool fetches all pages automatically when needed.

## API Versions

Different APIs use different version parameters:
- Skills API: `v=6.0`
- Users API: `v=6.0`
- Predefined Content API: `v=2.0`
- Domain API: `version=1.0`

Always use the version specified in the documentation.

## Best Practices

1. **Cache Domain Lookups**: Domain API results don't change often, cache them
2. **Reuse Access Tokens**: Tokens are valid for 1 hour, don't fetch new ones for each request
3. **Handle Errors Gracefully**: Some requests may fail, continue processing others
4. **Respect Rate Limits**: Implement backoff and retry logic
5. **Use Read-Only Endpoints**: Use `accountConfigReadOnly` for GET requests
6. **Batch Operations**: Process multiple items in sequence, not parallel (to avoid rate limits)

## Testing Endpoints

You can test endpoints manually using PowerShell:

```powershell
# Get access token (replace with your credentials)
$body = @{
    client_id = "your_client_id"
    client_secret = "your_client_secret"
    grant_type = "client_credentials"
}
$token = Invoke-RestMethod -Uri "https://sentinel.liveperson.net/sentinel/api/account/12345678/app/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"

# Use token to call API
$headers = @{
    Authorization = "Bearer $($token.access_token)"
}
Invoke-RestMethod -Uri "https://va.ac.liveperson.net/api/account/12345678/configuration/le-users/skills?v=6.0" -Headers $headers
```

Or use curl (at `c:\utils\curl\bin\curl.exe`):

```powershell
# Get token
c:\utils\curl\bin\curl.exe -X POST "https://sentinel.liveperson.net/sentinel/api/account/12345678/app/token" -H "Content-Type: application/x-www-form-urlencoded" -d "client_id=YOUR_ID&client_secret=YOUR_SECRET&grant_type=client_credentials"

# Use token
c:\utils\curl\bin\curl.exe -X GET "https://va.ac.liveperson.net/api/account/12345678/configuration/le-users/skills?v=6.0" -H "Authorization: Bearer YOUR_TOKEN"
```

## Additional Resources

- [LivePerson Developer Center](https://developers.liveperson.com/)
- [Skills API Documentation](https://developers.liveperson.com/skills-api-overview.html)
- [Users API Documentation](https://developers.liveperson.com/users-api-overview.html)
- [Predefined Content API Documentation](https://developers.liveperson.com/predefined-content-api-overview.html)
- [Domain API Documentation](https://developers.liveperson.com/domain-api.html)
- [OAuth 2.0 Documentation](https://developers.liveperson.com/oauth-2-0-client-credentials.html)
