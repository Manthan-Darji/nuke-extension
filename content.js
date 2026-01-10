console.log("Nuke My Data: HUNTER-KILLER V3.0 Loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_nuke") {
        processQueue(request.queue);
        sendResponse({ status: "acknowledged" });
    }
    return true;
});

async function processQueue(queue) {
    for (const emailData of queue) {
        await sendSingleEmail(emailData);
        await wait(2500); // 2.5s cooldown between emails
    }
    alert("SEQUENCE COMPLETE. CHECK 'SENT' FOLDER.");
}

async function sendSingleEmail(data) {
    return new Promise(async (resolve) => {
        // --- STEP 1: FIND COMPOSE BUTTON ---
        // We look for the button with the specific Google 'jscontroller' attribute or the text "Compose"
        let composeBtn = document.querySelector('div[jscontroller][role="button"][gh="cm"]') ||
            Array.from(document.querySelectorAll('div[role="button"]')).find(el => el.innerText === "Compose");

        if (!composeBtn) {
            console.error("Critical: Compose button not found.");
            // Try fallback for smaller screens
            composeBtn = document.querySelector('.T-I.T-I-KE.L3');
        }

        if (!composeBtn) {
            alert("ERROR: GMAIL LAYOUT UNKNOWN. RELOAD PAGE.");
            resolve(); return;
        }

        composeBtn.click();

        // Wait for the popup to appear (dynamic wait)
        await waitForElement('input[name="subjectbox"]');

        // --- STEP 2: INJECT DATA ---

        // Subject
        const subjectField = document.querySelector('input[name="subjectbox"]');
        if (subjectField) {
            subjectField.focus();
            document.execCommand('insertText', false, data.subject);
        }

        // To (Recipients) - Tricky part
        const toField = document.querySelector('input[peoplekit-id]') ||
            document.querySelector('input[autocomplete="email"]');
        if (toField) {
            toField.focus();
            document.execCommand('insertText', false, data.to);
            await wait(200);
            toField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); // Lock in the email
        }

        // Body
        const bodyField = document.querySelector('div[aria-label="Message Body"]') ||
            document.querySelector('div[role="textbox"][contenteditable="true"]');
        if (bodyField) {
            bodyField.focus();
            document.execCommand('insertText', false, data.body);
        }

        console.log(`Payload injected for ${data.to}`);

        // Optional: Auto-Send
        // const sendBtn = document.querySelector('div[role="button"][data-tooltip^="Send"]');
        // if(sendBtn) sendBtn.click();

        resolve();
    });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function waitForElement(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) return resolve(document.querySelector(selector));
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}