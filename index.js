import { launch } from 'puppeteer';

// ============================================================================
// CONFIGURATION
// ============================================================================
const args = process.argv.slice(2);
const usernameIndex = args.indexOf('--username');
const USERNAME = usernameIndex !== -1 && args[usernameIndex + 1]
    ? args[usernameIndex + 1]
    : "YOUR_USERNAME";
const DOMAIN_TO_SELECT = "imail.edu.vn";
const BASE_URL = "https://imail.edu.vn/";
const WAIT_AFTER_CREATE_MS = 5000;
const INBOX_WAIT_TIMEOUT_MS = 60000; // 60 seconds
const INBOX_POLL_INTERVAL_MS = 3000; // Check every 3 seconds

// ============================================================================
// SELECTORS
// ============================================================================
const SELECTORS = {
    usernameInput: 'input[name="user"]',
    domainInput: 'input[name="domain"][readonly]',
    submitButton: 'input[type="submit"][value="Oluştur"]',
    inboxRow: 'div.flex.items-center.gap-3.hover\\:bg-gray-200.border-b.border-dashed.py-4.px-7.cursor-pointer'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomizeWait(baseMs, varianceMs = 500) {
    return baseMs + Math.floor(Math.random() * varianceMs * 2) - varianceMs;
}

async function pollFor(page, selector, timeout, interval) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const element = await page.$(selector);
            if (element) return element;
        } catch (error) {
            // Continue polling
        }
        await sleep(interval);
    }
    return null;
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================
async function main() {
    let browser;

    try {
        const headless = !process.argv.includes('--show');

        console.error('Launching browser...');
        browser = await launch({
            headless: headless ? 'new' : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();

        // Hide webdriver to avoid bot detection
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(30000);

        // Navigate to page
        console.error('Navigating to', BASE_URL);
        await page.goto(BASE_URL, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        console.error('Page loaded');

        // Wait for Alpine.js/Livewire
        console.error('Waiting for page to initialize...');
        await sleep(5000);

        // Fill username - find the visible one
        console.error('Filling username:', USERNAME);

        await page.evaluate((username) => {
            const inputs = Array.from(document.querySelectorAll('input[name="user"]'));
            // Find the visible input (desktop version)
            const visibleInput = inputs.find(inp => {
                const style = window.getComputedStyle(inp);
                return style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    inp.offsetParent !== null;
            });

            if (visibleInput) {
                visibleInput.value = username;
                visibleInput.dispatchEvent(new Event('input', { bubbles: true }));
                visibleInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Username filled in visible input');
            } else {
                throw new Error('No visible username input found');
            }
        }, USERNAME);

        console.error('Username filled');

        // Click domain dropdown - find the visible one
        console.error('Opening domain dropdown...');

        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[name="domain"]'));
            const visibleInput = inputs.find(inp => {
                const style = window.getComputedStyle(inp);
                return style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    inp.offsetParent !== null;
            });

            if (visibleInput) {
                visibleInput.click();
                console.log('Domain dropdown clicked');
            } else {
                throw new Error('No visible domain input found');
            }
        });

        await sleep(1000);

        // Select domain
        console.error('Selecting domain:', DOMAIN_TO_SELECT);
        await page.evaluate((domain) => {
            const links = Array.from(document.querySelectorAll('a'));
            const domainLink = links.find(link => link.textContent.trim() === domain);
            if (domainLink) {
                domainLink.click();
            }
        }, DOMAIN_TO_SELECT);
        await sleep(1000);

        // Verify domain
        const selectedDomain = await page.$eval(SELECTORS.domainInput, el => el.value);
        console.error('Domain selected:', selectedDomain);

        // Submit form - find the visible submit button
        console.error('Submitting form...');

        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('input[type="submit"][value="Oluştur"]'));
            const visibleButton = buttons.find(btn => {
                const style = window.getComputedStyle(btn);
                return style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    btn.offsetParent !== null;
            });

            if (visibleButton) {
                visibleButton.click();
                console.log('Submit button clicked');
            } else {
                throw new Error('No visible submit button found');
            }
        });

        console.error('Form submitted');

        // Wait after submission
        const waitTime = randomizeWait(WAIT_AFTER_CREATE_MS);
        console.error(`Waiting ${waitTime}ms...`);
        await sleep(waitTime);

        // Poll for inbox emails
        console.error('Polling for inbox emails...');
        console.error(`Will check every ${INBOX_POLL_INTERVAL_MS}ms for up to ${INBOX_WAIT_TIMEOUT_MS}ms...`);

        const emailRow = await pollFor(page, SELECTORS.inboxRow, INBOX_WAIT_TIMEOUT_MS, INBOX_POLL_INTERVAL_MS);

        if (!emailRow) {
            // Take a screenshot to see what's on the page
            await page.screenshot({ path: 'debug-no-email.png', fullPage: true });
            console.error('Screenshot saved: debug-no-email.png');

            // Check if we're still on the right page
            const currentUrl = page.url();
            console.error('Current URL:', currentUrl);

            console.log(JSON.stringify({
                status: 'timeout',
                message: 'No email received within the expected time window.'
            }));
            process.exit(1);
        }

        // Extract email details
        console.error('Email found! Extracting details...');
        const emailDetails = await page.evaluate(() => {
            const firstRow = document.querySelector('div.flex.items-center.gap-3.hover\\:bg-gray-200.border-b.border-dashed.py-4.px-7.cursor-pointer');
            if (!firstRow) return null;

            // Get all direct child divs
            const childDivs = Array.from(firstRow.children);

            // First column: sender info (w-1/2 md:w-3/12)
            const senderColumn = childDivs[0];
            let senderName = '';
            let senderEmail = '';

            if (senderColumn) {
                // Get all text nodes and elements
                const textNodes = [];
                for (let node of senderColumn.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        textNodes.push(node.textContent.trim());
                    }
                }
                senderName = textNodes[0] || '';

                // Get email from .text-xs element
                const emailEl = senderColumn.querySelector('.text-xs');
                senderEmail = emailEl ? emailEl.textContent.trim() : '';
            }

            // Second column: subject (w-1/2 md:w-7/12)
            const subjectColumn = childDivs[1];
            const subject = subjectColumn ? subjectColumn.textContent.trim() : '';

            // Third column: time (hidden md:block w-full md:w-2/12)
            const timeColumn = childDivs[2];
            const relativeTime = timeColumn ? timeColumn.textContent.trim() : '';

            return {
                senderName,
                senderEmail,
                subject,
                relativeTime
            };
        });

        if (!emailDetails) {
            throw new Error('Failed to extract email details');
        }

        // Click on the first email to open it (triggers Alpine.js modal)
        console.error('Opening email...');
        await emailRow.click();
        console.error('Email clicked, waiting for modal and iframe...');

        // Wait for Alpine.js to show modal and load iframe
        await sleep(3000);

        // Check if iframe exists
        const iframeCheck = await page.evaluate(() => {
            const iframes = document.querySelectorAll('iframe');
            return {
                count: iframes.length,
                details: Array.from(iframes).map(iframe => ({
                    visible: iframe.offsetParent !== null,
                    hasSrcdoc: !!iframe.getAttribute('srcdoc'),
                    srcdocPreview: iframe.getAttribute('srcdoc')?.substring(0, 150) || ''
                }))
            };
        });
        console.error('Iframe check:', JSON.stringify(iframeCheck, null, 2));

        // Wait for iframe to appear
        try {
            await page.waitForSelector('iframe', { timeout: 10000 });
            console.error('Iframe found, extracting code...');
        } catch (e) {
            console.error('ERROR: Iframe not found!');
            await page.screenshot({ path: 'debug-no-iframe.png', fullPage: true });
            console.error('Screenshot saved');
            throw new Error('Iframe not found after clicking email');
        }

        const codeResult = await page.evaluate(() => {
            const iframe = document.querySelector('iframe');
            if (!iframe) return { code: null, error: 'No iframe found', debug: '' };

            const srcdoc = iframe.getAttribute('srcdoc');
            if (!srcdoc) return { code: null, error: 'No srcdoc attribute', debug: '' };

            // Decode HTML entities
            const decoded = srcdoc
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ');

            // Remove HTML tags for easier parsing
            const textOnly = decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

            // Debug: return first 300 chars
            const debugText = textOnly.substring(0, 300);

            // Extract verification code patterns
            // Pattern 1: "Tek kullanımlık kodunuz: 690063" (Turkish - case insensitive)
            const pattern1 = /tek\s+kullan[ıi]ml[ıi]k\s+kodunuz[:\s]+(\d{4,8})/i;
            const match1 = textOnly.match(pattern1);
            if (match1) return { code: match1[1], pattern: 'Turkish', debug: debugText };

            // Pattern 2: "verification code: 123456" or "code: 123456" (English)
            const pattern2 = /(?:verification\s+)?code[:\s]+(\d{4,8})/i;
            const match2 = textOnly.match(pattern2);
            if (match2) return { code: match2[1], pattern: 'English', debug: debugText };

            // Pattern 3: Any 4-8 digit number (common for verification codes)
            const pattern3 = /\b(\d{4,8})\b/;
            const match3 = textOnly.match(pattern3);
            if (match3) return { code: match3[1], pattern: 'Generic', debug: debugText };

            return {
                code: null,
                error: 'No pattern matched',
                debug: debugText
            };
        });

        console.error('Code extraction result:', JSON.stringify(codeResult));
        const verificationCode = codeResult.code;

        // Output result
        const result = {
            status: 'ok',
            username: `${USERNAME}@${DOMAIN_TO_SELECT}`,
            sender_name: emailDetails.senderName,
            sender_email: emailDetails.senderEmail,
            subject: emailDetails.subject,
            relative_time: emailDetails.relativeTime,
            verification_code: verificationCode || 'Not found'
        };

        console.log(JSON.stringify(result));

    } catch (error) {
        console.error('Error:', error.message);
        console.log(JSON.stringify({
            status: 'error',
            message: error.message
        }));
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
