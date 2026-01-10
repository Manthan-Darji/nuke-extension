document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('company-list');
    const nukeBtn = document.getElementById('nukeBtn');
    const statusDiv = document.getElementById('status');
    const apiKeyInput = document.getElementById('apiKey');

    // 1. AUTO-LOAD SAVED API KEY
    chrome.storage.local.get(['geminiKey'], (result) => {
        if (result.geminiKey) apiKeyInput.value = result.geminiKey;
    });

    // 2. Load Companies
    if (typeof TARGETS !== 'undefined') {
        TARGETS.forEach((company, index) => {
            const div = document.createElement('div');
            div.className = 'company-item';
            div.innerHTML = `<input type="checkbox" id="comp-${index}" value="${index}"><label for="comp-${index}">${company.name}</label>`;
            listContainer.appendChild(div);
        });
    }

    // 3. NUKE BUTTON LOGIC
    nukeBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) { updateStatus("Error: No API Key", true); return; }

        chrome.storage.local.set({ geminiKey: apiKey });

        const checkedBoxes = document.querySelectorAll('#company-list input:checked');
        if (checkedBoxes.length === 0) { updateStatus("Error: Select a target", true); return; }

        nukeBtn.disabled = true;
        updateStatus("AUTHENTICATING 2.5 FLASH...");

        let emailQueue = [];
        try {
            for (let i = 0; i < checkedBoxes.length; i++) {
                const index = checkedBoxes[i].value;
                const company = TARGETS[index];

                updateStatus(`Generated Payload for ${company.name}...`);

                // *** EXPLICIT CALL TO GEMINI 2.5 FLASH ***
                const bodyText = await generateWithGemini25(apiKey, company.name);

                emailQueue.push({
                    to: company.email,
                    subject: `Data Deletion Request - ${company.name}`,
                    body: bodyText
                });

                // MANDATORY WAIT: Your screenshot shows a 5 RPM limit.
                // We must wait 12 seconds between requests to stay safe.
                await new Promise(r => setTimeout(r, 12000));
            }

            updateStatus("INJECTING INTO GMAIL...");
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url.includes("mail.google.com")) {
                updateStatus("ERROR: Go to Gmail!", true); nukeBtn.disabled = false; return;
            }

            chrome.tabs.sendMessage(tab.id, { action: "start_nuke", queue: emailQueue }, (response) => {
                if (chrome.runtime.lastError) {
                    updateStatus("ERROR: REFRESH GMAIL", true);
                } else {
                    updateStatus("SEQUENCE STARTED.", false);
                    setTimeout(() => window.close(), 2000);
                }
            });

        } catch (e) {
            console.error(e);
            updateStatus(`FAIL: ${e.message}`, true);
            nukeBtn.disabled = false;
        }
    });

    function updateStatus(msg, isError = false) {
        statusDiv.textContent = msg;
        statusDiv.style.color = isError ? '#ff4444' : '#00ff41';
    }
});

// *** THE 2.5 FLASH FUNCTION ***
async function generateWithGemini25(apiKey, companyName) {
    // TARGETING YOUR SPECIFIC MODEL FROM THE SCREENSHOT
    const model = "gemini-2.5-flash";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Write a strictly professional, 50-word GDPR data deletion email to ${companyName}. 
    RULES: No subject line in body. No [Placeholders]. Sign as 'Privacy User'. Legal tone.`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) {
        const err = await response.json();
        // If 2.5 fails, it might be an alias issue, so we have ONE fallback
        if (response.status === 404) {
            console.warn("2.5 Flash alias failed, trying 1.5-flash-002...");
            return fallbackGen(apiKey, companyName);
        }
        throw new Error(err.error?.message || response.statusText);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("Empty Response from AI");
    }

    return data.candidates[0].content.parts[0].text;
}

async function fallbackGen(apiKey, companyName) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `Write a GDPR deletion email to ${companyName}. Short.`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}