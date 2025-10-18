const puppeteer = require('puppeteer');

async function debug() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to https://imail.edu.vn/...');
    await page.goto('https://imail.edu.vn/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    console.log('Page loaded! Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take a screenshot
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('Screenshot saved as debug-screenshot.png');

    // Get all input elements
    const inputs = await page.evaluate(() => {
        const allInputs = Array.from(document.querySelectorAll('input'));
        return allInputs.map(input => ({
            type: input.type,
            name: input.name,
            id: input.id,
            placeholder: input.placeholder,
            className: input.className,
            value: input.value,
            readonly: input.readOnly
        }));
    });

    console.log('\n=== ALL INPUT ELEMENTS ===');
    console.log(JSON.stringify(inputs, null, 2));

    // Get all buttons and submit elements
    const buttons = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        return allButtons.map(btn => ({
            tag: btn.tagName,
            type: btn.type,
            value: btn.value,
            textContent: btn.textContent?.trim(),
            className: btn.className
        }));
    });

    console.log('\n=== ALL BUTTONS ===');
    console.log(JSON.stringify(buttons, null, 2));

    // Get page HTML (first 5000 chars)
    const html = await page.content();
    console.log('\n=== PAGE HTML (first 5000 chars) ===');
    console.log(html.substring(0, 5000));

    console.log('\n\nBrowser will stay open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    await browser.close();
}

debug().catch(console.error);
