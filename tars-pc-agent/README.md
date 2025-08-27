# TARS PC Agent System

This is a TARS-powered PC agent for various automation tasks, including file organization, book formatting, and publishing automation.

## Project Overview

### Core Modules
*   **Pietarien Archivist**: File Organization
*   **Reedsy Repair Agent**: Formatting Fixes
*   **Chat Auto-Filing System**: Chat categorization
*   **Book QA System**: Book Q&A system
*   **Publishing Assistant**: Publishing workflows

### Key Features
*   Organizes 65+ Pietarien ideas automatically
*   Fixes Reedsy formatting issues in real-time
*   Auto-categorizes AI chat histories
*   Provides book content Q&A using retrieval
*   Automates publisher outreach workflows
*   Multi-model AI integration (Copilot, Kimi, Local LLMs)

## Installation & Setup

### 1. Prerequisites
*   **Node.js**: Install the LTS version from [https://nodejs.org/](https://nodejs.org/)
*   **Agent TARS CLI**: Install globally using npm:
    ```bash
    npm install -g @agent-tars/cli
    ```
    Or use npx for the latest version:
    ```bash
    npx @agent-tars/cli@latest --version
    ```

### 2. Project Setup
1.  **Create project directory**:
    ```bash
    mkdir tars-pc-agent
    cd tars-pc-agent
    ```
2.  **Initialize Node.js project**:
    ```bash
    npm init -y
    ```
3.  **Install dependencies**:
    ```bash
    npm install chokidar pdf-parse mammoth markdown-it text-extract commander winston jsdom axios puppeteer
    ```

## Configuration

Edit the following files in the `config/` directory to customize the agent's behavior:

*   `settings.json`: Configure API keys, file paths, and module-specific settings.
*   `prompts.json`: Customize AI prompts for various tasks.
*   `rules.json`: Define formatting rules for the Reedsy Repair Agent.

## Running the Agent

Navigate to the `tars-pc-agent` directory in your terminal.

### Pietarien Archivist (File Organization)
```bash
npm run organize-pietarien
```

### Reedsy Repair Agent (Book Chapter Formatting)
1.  Open Reedsy editor in your browser.
2.  Run the agent:
    ```bash
    npm run repair-reedsy
    ```

### Chat Auto-Filer
*   One-time processing:
    ```bash
    npm run file-chats
    ```
*   Watch for new chats (continuous monitoring):
    ```bash
    npm run file-chats -- --watch
    ```

### Book QA System
*   Ingest a book:
    ```bash
    npm run book-qa ingest "/path/to/your/book.pdf" "MyBookTitle"
    ```
*   Ask a question (after ingesting):
    ```bash
    npm run book-qa ask "What are the main themes of the book?"
    ```
*   Start interactive Q&A session:
    ```bash
    npm run book-qa interactive
    ```

### Publishing Assistant
*   Quick publisher outreach:
    ```bash
    npm run publish-assist outreach "My Awesome Book" "Non-fiction" "A groundbreaking book on AI and society"
    ```
*   Generate social media calendar:
    ```bash
    npm run publish-assist social "My Awesome Book" "Non-fiction"
    ```
*   Launch full campaign:
    ```bash
    npm run publish-assist campaign "My Awesome Book" "Non-fiction" "A groundbreaking book on AI and society" "Your Name"
    ```

## Important Considerations

*   **API Keys**: Ensure your API keys in `config/settings.json` are correct and kept private.
*   **File Paths**: Double-check all file paths in `config/settings.json` to ensure they point to the correct locations on your system.
*   **Agent TARS CLI**: The system relies on the `npx @agent-tars/cli` command. Ensure it's correctly installed and accessible from your terminal.
*   **Browser Compatibility (Reedsy Repair Agent)**: The Reedsy Repair Agent interacts with your browser. Ensure your browser is up-to-date and compatible with Agent TARS CLI's browser automation capabilities.
*   **Troubleshooting**: If you encounter errors, check the `logs/` directory for more detailed error messages. Common issues include incorrect file paths, missing API keys, or network connectivity problems.

---

**Author**: Manus AI
**Date**: August 26, 2025


