console.log("Nuke My Data: Content Script Loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_nuke") {
        console.log("Nuke Sequence Received:", request.queue);
        processQueue(request.queue);
        sendResponse({ status: "started" });
    }
});

async function processQueue(queue) {
    for (const emailData of queue) {
        await sendSingleEmail(emailData);
        // Wait 5 seconds between emails to prevent Gmail spam detection
        await wait(5000);
    }
    alert("ALL TARGETS PROCESSED.");
}

async function sendSingleEmail(data) {
    return new Promise(async (resolve) => {
        // 1. Click Compose
        const composeBtn = document.querySelector('div[role="button"][gh="cm"]');
        if (!composeBtn) {
            console.error("Compose button not found");
            resolve(); return;
        }
        composeBtn.click();

        // Wait for window to appear
        await wait(2000);

        // 2. Select Fields (Selectors updated for 2026)
        // 'To' field is often a textarea or input with 'peoplekit-id'
        let toField = document.querySelector('input[peoplekit-id]') ||
            document.querySelector('div[name="to"] input') ||
            document.querySelector('textarea[name="to"]');

        let subjectField = document.querySelector('input[name="subjectbox"]');
        let bodyField = document.querySelector('div[aria-label="Message Body"]') ||
            document.querySelector('div[role="textbox"][aria-label="Message Body"]');

        // 3. Fill Data
        if (toField && subjectField && bodyField) {
            // Fill To
            toField.focus();
            document.execCommand('insertText', false, data.to);
            // Press Tab/Enter to solidify the chip
            toField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

            // Fill Subject
            subjectField.focus();
            document.execCommand('insertText', false, data.subject);

            // Fill Body
            bodyField.focus();
            document.execCommand('insertText', false, data.body);

            // 4. CLICK SEND (Optional - uncomment to enable auto-send)
            // Be careful: Gmail send button usually has text "Send" or role "button"
            await wait(1000);

            // Find button that contains text "Send" and is visible
            const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
            const sendBtn = buttons.find(b => b.innerText === 'Send' && b.offsetParent !== null);

            if (sendBtn) {
                // UNCOMMENT THE NEXT LINE TO ACTUALLY SEND
                sendBtn.click();
                console.log(`Sent to ${data.to}`);
            } else {
                console.log("Send button not found (or auto-send disabled for safety)");
            }

            // If we sent it, the window closes. If not, we might need to close it manually or leave it.
            // For this demo, assuming click() worked, the window closes.
        }
        resolve();
    });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}