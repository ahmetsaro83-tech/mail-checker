# iMail.edu.vn Inbox Checker

Automated Node.js script using Puppeteer to check the latest email in an imail.edu.vn temporary inbox.

## Features

- Automated form filling and submission
- Domain selection from dropdown
- Inbox polling with configurable timeout
- Extracts sender name, email, subject, and timestamp
- JSON output for easy parsing
- Headless mode by default with `--show` flag for debugging
- Robust error handling and retries

## Prerequisites

- Node.js (LTS version recommended, v18+)
- npm or yarn

## Installation

```bash
npm install
```

This will install Puppeteer and its dependencies (including Chromium).

## Configuration

Edit the configuration section at the top of `index.js`:

```javascript
const USERNAME = "YOUR_USERNAME";        // Your desired username (without @domain)
const DOMAIN_TO_SELECT = "imail.edu.vn"; // Domain to select
const BASE_URL = "https://imail.edu.vn/";
const WAIT_AFTER_CREATE_MS = 4000;       // Wait time after form submission
const INBOX_WAIT_TIMEOUT_MS = 20000;     // Total time to wait for emails
const INBOX_POLL_INTERVAL_MS = 2000;     // Check interval
```

## Usage

### Run in headless mode (default):

```bash
npm start
```

or

```bash
node index.js
```

### Run with visible browser (for debugging):

```bash
node index.js --show
```

## Output

### Success:

```json
{
  "status": "ok",
  "username": "ozan_test@imail.edu.vn",
  "sender_name": "Ozan",
  "sender_email": "poetwhitecloud@gmail.com",
  "subject": "deneme",
  "relative_time": "55 saniye önce"
}
```

### Timeout (no email received):

```json
{
  "status": "timeout",
  "message": "No email received within the expected time window."
}
```

### Error:

```json
{
  "status": "error",
  "message": "Error description here"
}
```

## How It Works

1. Launches Puppeteer browser
2. Navigates to imail.edu.vn
3. Fills in the username field
4. Opens domain dropdown and selects "imail.edu.vn"
5. Submits the form
6. Waits for the specified time
7. Polls the inbox for new emails
8. Extracts details from the first (latest) email
9. Outputs JSON to console

## Troubleshooting

- **Selectors not working**: The website UI may have changed. Check the SELECTORS object in `index.js` and update accordingly.
- **Timeout issues**: Increase `INBOX_WAIT_TIMEOUT_MS` if emails take longer to arrive.
- **Browser launch fails**: Ensure you have sufficient permissions and dependencies installed.
- **Use `--show` flag**: Run with visible browser to debug issues visually.

## Exit Codes

- `0`: Success
- `1`: Error or timeout

## Notes

- The script uses randomized wait times (±500ms) to mimic human behavior
- All main operations include timeouts and error handling
- Diagnostic messages are printed to stderr, final JSON to stdout
- The script automatically closes the browser on both success and failure
