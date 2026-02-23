# Getting Started with LivePerson Skill Cleaner

Welcome! This guide will help you get started with the tool in just a few steps.

## What You'll Need

Before starting, make sure you have:
- [ ] Node.js installed (version 18 or higher)
- [ ] Your LivePerson account ID
- [ ] OAuth 2.0 Client ID and Secret
- [ ] Access to your LivePerson Conversational Cloud account

## Step 1: Install Node.js (If Not Already Installed)

1. Go to https://nodejs.org/
2. Download the LTS (Long Term Support) version
3. Run the installer
4. Restart PowerShell
5. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

## Step 2: Install Project Dependencies

Open PowerShell and navigate to the project folder:

```powershell
cd C:\Users\shmulikg\DeleteSkill
npm install
```

Wait for the installation to complete (should take 10-30 seconds).

## Step 3: Set Up Your Credentials

### Get Your LivePerson Credentials

You need three pieces of information:

1. **Account ID**: Your LivePerson site ID (usually 8 digits)
2. **Client ID**: OAuth 2.0 Client ID
3. **Client Secret**: OAuth 2.0 Client Secret

If you don't have OAuth credentials yet:
1. Log in to LivePerson Conversational Cloud
2. Go to **Users** section
3. Create or select an API user
4. Generate OAuth 2.0 credentials
5. Copy the Client ID and Client Secret

### Configure the Tool

1. Create your `.env` file:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Open `.env` in Notepad:
   ```powershell
   notepad .env
   ```

3. Replace the placeholder values:
   ```
   LP_ACCOUNT_ID=12345678
   LP_CLIENT_ID=abc123def456
   LP_CLIENT_SECRET=xyz789uvw012
   ```

4. Save and close Notepad

## Step 4: Test Your Setup

Run this command to test if everything is working:

```powershell
node src/index.js list-skills
```

**If successful**, you'll see a table of all your skills:
```
[INFO] Fetching all skills...
[SUCCESS] Retrieved 15 skills

Total Skills: 15
================================================================================

┌─────────────────┬────────────────────────┬──────────────────────────┐
│ Skill ID        │ Skill Name             │ Description              │
├─────────────────┼────────────────────────┼──────────────────────────┤
│ 12345           │ Sales Support          │ Handles sales inquiries  │
│ 12346           │ Technical Support      │ Technical support        │
...
```

**If you see errors**, check:
- Your credentials in `.env` are correct
- Your account ID is correct
- Your OAuth client has the necessary permissions
- See `TROUBLESHOOTING.md` for more help

## Step 5: Find Dependencies for a Skill

Now try finding dependencies for a skill. Replace `12345` with an actual skill ID from your list:

```powershell
node src/index.js find -s 12345
```

You'll see:
- How many users have this skill
- Which users have this skill
- How many canned responses use this skill
- Which canned responses use this skill
- Whether engagements or widgets use this skill

## Step 6: Export a Report (Optional)

To save the results to a file:

```powershell
node src/index.js find -s 12345 -o report.csv
```

This creates a CSV file you can open in Excel.

## Step 7: Remove Dependencies (When Ready)

### Important: Test First!

Always run with `--dry-run` first to see what would happen:

```powershell
node src/index.js remove -s 12345 --dry-run
```

This shows you what would change WITHOUT actually making any changes.

### Make the Changes

If the dry run looks good:

```powershell
node src/index.js remove -s 12345 -e all
```

This will:
1. Create an automatic backup
2. Show a 5-second warning (you can press Ctrl+C to cancel)
3. Remove the skill from all users
4. Remove the skill from all canned responses
5. Show a summary of what was changed

### Delete the Skill

Once all dependencies are removed:

```powershell
node src/index.js remove -s 12345 --delete-skill
```

Or delete it manually in the LivePerson UI.

## Common First-Time Questions

### Q: Will this break my LivePerson account?

No. The tool only removes skill assignments, it doesn't delete users or canned responses. You can always reassign skills manually if needed.

### Q: What if something goes wrong?

The tool creates automatic backups before making changes. You can also run with `--dry-run` to preview changes first.

### Q: Can I undo changes?

Backups are created in the `backups/` folder. You can use them to manually restore the original state if needed.

### Q: What about engagements and widgets?

The tool will tell you if engagements or widgets use the skill, but you'll need to remove them manually in the LivePerson UI (they use internal APIs).

### Q: Is this safe to use in production?

Yes, but we recommend:
1. Test in a sandbox environment first (if available)
2. Always use `--dry-run` before making changes
3. Create backups (done automatically)
4. Start with one skill to verify it works as expected

### Q: How long does it take?

- Finding dependencies: 5-30 seconds (depends on account size)
- Removing dependencies: 1-5 minutes (depends on number of dependencies)
- The tool processes items sequentially to avoid rate limits

## Next Steps

Now that you're set up:

1. **Explore**: Try different commands to get familiar
   ```powershell
   node src/index.js --help
   node src/index.js find --help
   ```

2. **Read examples**: Check `EXAMPLE_USAGE.md` for real-world scenarios

3. **Learn more**: Read `README.md` for complete documentation

4. **Advanced features**: See `INTERNAL_API_GUIDE.md` to extend the tool

## Quick Reference Card

Save this for quick access:

```powershell
# List all skills
node src/index.js list-skills

# Find dependencies
node src/index.js find -s SKILL_ID

# Export to CSV
node src/index.js find -s SKILL_ID -o report.csv

# Preview removal
node src/index.js remove -s SKILL_ID --dry-run

# Remove dependencies
node src/index.js remove -s SKILL_ID -e all

# Create backup
node src/index.js backup -s SKILL_ID

# Get help
node src/index.js --help
```

## Congratulations!

You're now ready to use the LivePerson Skill Cleaner. Start by listing your skills and finding dependencies for one of them.

**Remember**: Always test with `--dry-run` first!

## Need Help?

- **Quick questions**: Check `TROUBLESHOOTING.md`
- **Usage examples**: See `EXAMPLE_USAGE.md`
- **Complete docs**: Read `README.md`
- **All docs**: See `README.md`
