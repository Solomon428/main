# Visual Studio Code Workspace Setup

- This document describes how to configure the CreditorFlow workspace in VS Code for zero-drift alignment.
- Files added:
  - creditorflow.code-workspace
  - .vscode/settings.json
  - .vscode/tasks.json
  - .vscode/launch.json
- How to use:
  - Open the repo with the CreditorFlow Workspace.
  - Use the Tasks panel to run the recommended flow:
    1) Install dependencies
    2) Prisma generate
    3) DB push
    4) TypeScript check
    5) Build
  - Use the Run/Debug to start the app.
- Live configuration:
  - Ensure ENV vars (DATABASE_URL, etc) are kept in .env or workspace env config.
- Verification steps:
  - After patch, run tasks; verify DB connectivity; compile TS; run dev server; run test endpoints.
