# START HERE

## Welcome to LivePerson Skill Cleaner!

This tool solves a common LivePerson administration problem: **deleting skills that have dependencies**.

## The Problem

When you try to delete a skill in LivePerson, you might see this error:

> **"skill cannot be deleted because it is assigned to the following entities: skills, cannedResponses, engagements, widgets, users"**

Manually finding and removing all these dependencies is tedious and error-prone.

## The Solution

This tool **automatically**:
1. Finds all entities using a skill
2. Removes the skill from those entities
3. Lets you safely delete the skill

## Quick Start (5 Minutes)

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Credentials
```powershell
Copy-Item .env.example .env
notepad .env
```

Add your LivePerson credentials:
```
LP_ACCOUNT_ID=your_account_id
LP_CLIENT_ID=your_client_id
LP_CLIENT_SECRET=your_client_secret
```

### 3. Grant API Permissions (IMPORTANT!)

Your OAuth application needs permissions to access the APIs:

1. Log into LivePerson Conversational Cloud
2. Go to **Manage** > **Management Console**
3. Search for **"Application Install"**
4. Find your OAuth application (Client ID: `your_client_id`)
5. Click **"Edit"**
6. Grant permissions for:
   - **Skills API** (Read and Write)
   - **Users API** (Read and Write)
   - **Predefined Content API** (Read and Write)
7. Click **"Save"**
8. Wait 2-5 minutes for changes to propagate

**See `PERMISSION_SETUP.md` for detailed instructions with screenshots.**

### 4. Test It
```powershell
node src/index.js list-skills
```

### 4. Find Dependencies
```powershell
node src/index.js find -s 12345
```
(Replace `12345` with your skill ID)

### 5. Remove Dependencies
```powershell
# Preview first
node src/index.js remove -s 12345 --dry-run

# Then remove
node src/index.js remove -s 12345 -e all
```

## What You Get

- **Automated dependency finding** for users and canned responses
- **Automated removal** with safety features
- **Export reports** to CSV or JSON
- **Backup and restore** capabilities
- **Dry-run mode** to preview changes
- **Comprehensive documentation** (12 guides)

## Documentation Guide

Choose based on your needs:

| I Want To... | Read This |
|--------------|-----------|
| Get started in 5 minutes | You're reading it! |
| Step-by-step setup | `GET_STARTED.md` |
| See usage examples | `EXAMPLE_USAGE.md` |
| Understand the APIs | `API_REFERENCE.md` |
| Fix problems | `TROUBLESHOOTING.md` |
| See everything | `README.md` |
| Capture internal APIs | `INTERNAL_API_GUIDE.md` |

## Key Commands

```powershell
# List all skills
node src/index.js list-skills

# Find dependencies
node src/index.js find -s SKILL_ID

# Export to CSV
node src/index.js find -s SKILL_ID -o report.csv

# Preview removal (safe)
node src/index.js remove -s SKILL_ID --dry-run

# Remove dependencies
node src/index.js remove -s SKILL_ID -e all

# Get help
node src/index.js --help
```

## Safety Features

- **Dry-run mode**: See changes before applying
- **Automatic backups**: Created before any changes
- **5-second warning**: Time to cancel before changes
- **Error handling**: Continues even if some items fail
- **Detailed logging**: See exactly what's happening

## What's Included

### Fully Working
- Users API integration
- Canned Responses API integration
- Skills API integration
- Dependency finding
- Automated removal
- Export to CSV/JSON
- Backup creation
- All CLI commands

### Manual Steps Required
- Engagements (guidance provided)
- Widgets (guidance provided)

## Technology

- **Platform**: Node.js CLI
- **Language**: JavaScript (ES6+)
- **Dependencies**: 6 packages (axios, commander, chalk, etc.)
- **Works on**: Windows, Mac, Linux

## Project Structure

```
DeleteSkill/
├── src/                    # Source code (12 files)
│   ├── api/                # API integrations
│   ├── services/           # Business logic
│   └── utils/              # Utilities
├── config/                 # Configuration
├── Documentation (12 files)
├── .env                    # Your credentials (create this)
└── package.json            # Dependencies
```

## Common Questions

**Q: Is this safe?**
Yes. It only removes skill assignments, not the entities themselves. Always test with `--dry-run` first.

**Q: Can I undo changes?**
Backups are created automatically. You can use them to manually restore if needed.

**Q: What about engagements and widgets?**
The tool will tell you if they exist, but you'll need to remove them manually in the UI.

**Q: How long does it take?**
- Finding dependencies: 5-30 seconds
- Removing dependencies: 1-5 minutes
- Depends on account size

**Q: Will it work with my account?**
Yes, it works with any LivePerson account that has OAuth 2.0 API access.

## Your Next Steps

1. **Now**: Configure your `.env` file
2. **Test**: Run `node src/index.js list-skills`
3. **Try**: Find dependencies for a skill
4. **Use**: Remove dependencies when ready

## Need Help?

- **Step-by-step**: See `GET_STARTED.md`
- **Problems**: See `TROUBLESHOOTING.md`
- **Examples**: See `EXAMPLE_USAGE.md`
- **Everything**: See `README.md`

---

**Ready to start?** → Configure `.env` and run `node src/index.js list-skills`

**Need detailed walkthrough?** → Open `GET_STARTED.md`
