# Example Usage Scenarios

This document shows real-world examples of using the LivePerson Skill Cleaner tool.

## Scenario 1: Quick Check Before Deletion

You want to delete skill ID 12345 and need to know what's blocking it.

```powershell
# Quick check
node src/index.js find -s 12345
```

**Output**:
```
[INFO] Searching for dependencies of skill ID: 12345...
[SUCCESS] Retrieved 45 users
[SUCCESS] Found 3 users with skill 12345
[SUCCESS] Retrieved 120 predefined content items
[SUCCESS] Found 2 predefined content items with skill 12345

Skill: Sales Support (ID: 12345)
================================================================================

┌──────────────────┬───────┐
│ Entity Type      │ Count │
├──────────────────┼───────┤
│ Users            │ 3     │
│ Canned Responses │ 2     │
│ Engagements      │ 0     │
│ Widgets          │ 0     │
└──────────────────┴───────┘

Users with this skill:
┌─────────┬────────────────┬─────────────────────────┐
│ User ID │ Login Name     │ Email                   │
├─────────┼────────────────┼─────────────────────────┤
│ 1001    │ john.doe       │ john.doe@company.com    │
│ 1002    │ jane.smith     │ jane.smith@company.com  │
│ 1003    │ bob.johnson    │ bob.johnson@company.com │
└─────────┴────────────────┴─────────────────────────┘

Canned Responses with this skill:
┌──────┬──────────────────────────┬──────┐
│ ID   │ Title                    │ Type │
├──────┼──────────────────────────┼──────┤
│ 5001 │ Welcome Message          │ N/A  │
│ 5002 │ Product Information      │ N/A  │
└──────┴──────────────────────────┴──────┘

Total Dependencies: 5

This skill cannot be deleted until 5 dependencies are removed.
```

## Scenario 2: Export Report for Team Review

You need to share the dependency list with your team.

```powershell
# Export to CSV for Excel
node src/index.js find -s 12345 -o skill-12345-report.csv
```

**Output**:
```
[INFO] Searching for dependencies of skill ID: 12345...
[SUCCESS] Retrieved 45 users
[SUCCESS] Found 3 users with skill 12345
[SUCCESS] Retrieved 120 predefined content items
[SUCCESS] Found 2 predefined content items with skill 12345

Exported to CSV: skill-12345-report.csv
```

The CSV file will contain:
- skillId, skillName, entityType, entityId, entityName, entityEmail, entityDetails

## Scenario 3: Safe Removal with Dry Run

You want to see what would happen before making changes.

```powershell
# Preview changes
node src/index.js remove -s 12345 --dry-run
```

**Output**:
```
[INFO] ================================================================================
[INFO] DRY RUN: Removing skill 12345 from dependencies
[INFO] ================================================================================

[INFO] Searching for dependencies of skill ID: 12345...
[SUCCESS] Retrieved skill: Sales Support
[SUCCESS] Found 3 users with skill 12345
[SUCCESS] Found 2 predefined content items with skill 12345

[INFO] Processing 3 users...
[INFO] DRY RUN: Would remove skill from the following users:
[INFO]   - john.doe (ID: 1001)
[INFO]   - jane.smith (ID: 1002)
[INFO]   - bob.johnson (ID: 1003)

[INFO] Processing 2 canned responses...
[INFO] DRY RUN: Would remove skill from the following canned responses:
[INFO]   - Welcome Message (ID: 5001)
[INFO]   - Product Information (ID: 5002)

Removal Summary
================================================================================

┌──────────────────┬─────────┬────────┐
│ Entity Type      │ Updated │ Failed │
├──────────────────┼─────────┼────────┤
│ users            │ 3       │ 0      │
│ cannedResponses  │ 2       │ 0      │
│ engagements      │ 0       │ 0      │
│ widgets          │ 0       │ 0      │
└──────────────────┴─────────┴────────┘

This was a dry run. No changes were made.
Run without --dry-run to apply changes.
```

## Scenario 4: Remove Dependencies Step by Step

You want to be cautious and remove dependencies one type at a time.

```powershell
# Step 1: Create backup
node src/index.js backup -s 12345

# Step 2: Remove from users first
node src/index.js remove -s 12345 -e users

# Step 3: Verify users were updated
node src/index.js find -s 12345

# Step 4: Remove from canned responses
node src/index.js remove -s 12345 -e cannedResponses

# Step 5: Verify all dependencies are gone
node src/index.js find -s 12345

# Step 6: Delete the skill (if no dependencies remain)
node src/index.js remove -s 12345 --delete-skill
```

## Scenario 5: Bulk Processing Multiple Skills

You need to clean up several old skills.

```powershell
# Find dependencies for multiple skills
node src/index.js find-multiple -s 12345,12346,12347 -o multi-skill-report.json
```

Then process each one individually:
```powershell
node src/index.js remove -s 12345 -e all
node src/index.js remove -s 12346 -e all
node src/index.js remove -s 12347 -e all
```

## Scenario 6: Full Automated Cleanup

You're confident and want to remove all dependencies and delete the skill in one command.

```powershell
# Create backup first (recommended)
node src/index.js backup -s 12345

# Remove all dependencies and delete skill
node src/index.js remove -s 12345 -e all --delete-skill
```

**Output**:
```
[INFO] Searching for dependencies of skill ID: 12345...
[SUCCESS] Retrieved skill: Sales Support
[SUCCESS] Found 3 users with skill 12345
[SUCCESS] Found 2 predefined content items with skill 12345
[SUCCESS] Backup created: backups/skill-12345-backup-2026-02-22T10-30-45.json

⚠️  WARNING: This will modify your LivePerson configuration!
Press Ctrl+C to cancel, or wait 5 seconds to continue...

[INFO] Processing 3 users...
[INFO] Removing skill 12345 from user 1001...
[SUCCESS] Removed skill 12345 from user 1001
[INFO] Removing skill 12345 from user 1002...
[SUCCESS] Removed skill 12345 from user 1002
[INFO] Removing skill 12345 from user 1003...
[SUCCESS] Removed skill 12345 from user 1003
[INFO] Batch update complete: 3 succeeded, 0 failed

[INFO] Processing 2 canned responses...
[INFO] Removing skill 12345 from predefined content 5001...
[SUCCESS] Removed skill 12345 from predefined content 5001
[INFO] Removing skill 12345 from predefined content 5002...
[SUCCESS] Removed skill 12345 from predefined content 5002
[INFO] Batch update complete: 2 succeeded, 0 failed

[INFO] Attempting to delete skill...
[SUCCESS] Skill 12345 deleted successfully!

Removal Summary
================================================================================

┌──────────────────┬─────────┬────────┐
│ Entity Type      │ Updated │ Failed │
├──────────────────┼─────────┼────────┤
│ users            │ 3       │ 0      │
│ cannedResponses  │ 2       │ 0      │
│ engagements      │ 0       │ 0      │
│ widgets          │ 0       │ 0      │
└──────────────────┴─────────┴────────┘
```

## Scenario 7: Handling Errors

Sometimes individual items may fail to update.

```powershell
node src/index.js remove -s 12345 -e users
```

**Output with errors**:
```
[INFO] Processing 5 users...
[SUCCESS] Removed skill 12345 from user 1001
[SUCCESS] Removed skill 12345 from user 1002
[ERROR] Failed to remove skill from user 1003: User is locked
[SUCCESS] Removed skill 12345 from user 1004
[ERROR] Failed to remove skill from user 1005: Permission denied
[INFO] Batch update complete: 3 succeeded, 2 failed

Removal Summary
================================================================================

┌──────────────────┬─────────┬────────┐
│ Entity Type      │ Updated │ Failed │
├──────────────────┼─────────┼────────┤
│ users            │ 3       │ 2      │
└──────────────────┴─────────┴────────┘
```

The tool continues processing even if some items fail, so you can address failures manually.

## Scenario 8: Working with Engagements (Manual)

If engagements are found:

```powershell
node src/index.js find -s 12345
```

**Output**:
```
Engagements with this skill:
┌──────┬─────────────────────┐
│ ID   │ Name                │
├──────┼─────────────────────┤
│ 9001 │ Sales Campaign      │
│ 9002 │ Support Campaign    │
└──────┴─────────────────────┘

[WARN] Engagements API is internal and must be captured from browser DevTools
[WARN] For now, please check engagements manually in the UI
```

**Manual steps**:
1. Note the engagement IDs: 9001, 9002
2. Go to LivePerson UI > Engagement Studio
3. Open each engagement (9001, 9002)
4. Change the skill assignment to a different skill or remove it
5. Save the engagement
6. Run the tool again to verify

## Scenario 9: List All Skills to Find the Right ID

You know the skill name but not the ID.

```powershell
node src/index.js list-skills
```

**Output**:
```
Total Skills: 15
================================================================================

┌─────────────────┬────────────────────────────────┬──────────────────────────────────────────────────┐
│ Skill ID        │ Skill Name                     │ Description                                      │
├─────────────────┼────────────────────────────────┼──────────────────────────────────────────────────┤
│ 12345           │ Sales Support                  │ Handles sales inquiries and product questions    │
│ 12346           │ Technical Support              │ Technical troubleshooting and product support    │
│ 12347           │ Billing                        │ Billing and payment related questions            │
│ 12348           │ General Support                │ General customer service inquiries               │
...
└─────────────────┴────────────────────────────────┴──────────────────────────────────────────────────┘
```

Now you can find the skill ID and use it in other commands.

## Scenario 10: Export for Audit Trail

You need documentation for compliance or audit purposes.

```powershell
# Create detailed report
node src/index.js find -s 12345 -o audit-reports/skill-12345-dependencies.json

# Create backup
node src/index.js backup -s 12345 -o audit-reports/skill-12345-backup.json

# Perform removal (backup is created automatically)
node src/index.js remove -s 12345 -e all

# The backup will be in backups/ folder with timestamp
```

## Tips

1. **Always run `find` first** to see what you're dealing with
2. **Use `--dry-run`** to preview changes
3. **Create backups** before making changes
4. **Process incrementally** if you're unsure (users first, then canned responses)
5. **Export reports** to document your work
6. **Check manually** for engagements and widgets until internal APIs are captured

## Troubleshooting Examples

### "Skill cannot be deleted"

Even after running the tool, you might see this error. This means:
- Engagements or widgets still reference the skill (check manually)
- There's another entity type not covered by the tool
- The skill is a default/system skill that cannot be deleted

### "No changes were made"

If you run the remove command but nothing happens:
- Check that the skill ID is correct
- Verify the skill actually has dependencies (run `find` first)
- Check the logs for error messages

### "Authentication failed"

- Verify your `.env` file has correct credentials
- Check that your OAuth client has the necessary permissions
- Try listing skills first to test authentication: `node src/index.js list-skills`
