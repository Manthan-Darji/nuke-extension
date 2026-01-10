document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('company-list');
    const nukeBtn = document.getElementById('nukeBtn');
    const statusDiv = document.getElementById('status');
    const apiKeyInput = document.getElementById('apiKey');

    // 1. AUTO-LOAD SAVED API KEY
    chrome.storage.local.get(['geminiKey'], (result) => {
        if (result.geminiKey) {
            apiKeyInput.value = result.geminiKey;
        }
    });

    // 2. Load Companies
    TARGETS.forEach((company, index) => {
        const div = document.createElement('div');
        div.className = 'company-item';
        div.innerHTML = `
            <input type="checkbox" id="comp-${index}" value="${index}">
            <label for="comp-${index}">${company.name}</label>
        `;
        listContainer.appendChild(div);
    });

    // 3. NUKE BUTTON LOGIC
    nukeBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            updateStatus("Error: No API Key", true);
            return;
        }

        // SAVE API KEY
        chrome.storage.local.set({ geminiKey: apiKey });

        const checkedBoxes = document.querySelectorAll('#company-list input:checked');
        if (checkedBoxes.length === 0) {
            updateStatus("Error: Select a target", true);
            return;
        }

        nukeBtn.disabled = true;
        updateStatus("Initializing AI Model: gemini-2.5-flash...");

        let emailQueue = [];

        try {
            for (let i = 0; i < checkedBoxes.length; i++) {
                const index = checkedBoxes[i].value;
                const company = TARGETS[index];

                updateStatus(`Generating email for ${company.name}...`);

                // GENERATE CONTENT
                const bodyText = await generateEmailWithGemini(apiKey, company.name);

                emailQueue.push({
                    to: company.email,
                    subject: `Data Deletion Request - ${company.name}`,
                    body: bodyText
                });
            }

            updateStatus("Injecting Payload into Gmail...");

            // Send to Content Script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // CHECK IF GMAIL IS OPEN
            if (!tab.url.includes("mail.google.com")) {
                updateStatus("ERROR: You must be on a Gmail tab!", true);
                nukeBtn.disabled = false;
                return;
            }

            chrome.tabs.sendMessage(tab.id, {
                action: "start_nuke",
                queue: emailQueue
            }, (response) => {
                if (chrome.runtime.lastError) {
                    // THIS IS THE COMMON ERROR
                    console.error(chrome.runtime.lastError);
                    updateStatus("CONNECTION ERROR: Refresh your Gmail tab and try again.", true);
                    nukeBtn.disabled = false;
                } else {
                    updateStatus("SEQUENCE STARTED. CHECK GMAIL.", false);
                    setTimeout(() => window.close(), 2000); // Optional: Close popup
                }
            });

        } catch (e) {
            console.error(e);
            // SHOW THE REAL ERROR ON SCREEN
            updateStatus(`API FAIL: ${e.message}`, true);
            nukeBtn.disabled = false;
        }
    });

    function updateStatus(msg, isError = false) {
        statusDiv.textContent = msg;
        statusDiv.style.color = isError ? '#ff4444' : '#00ff41';
    }
});

async function generateEmailWithGemini(apiKey, companyName) {
    // *** FIX: UPDATED TO GEMINI 2.5 FLASH ***
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Write a strictly professional, 50-word GDPR data deletion email to ${companyName}. No subject line. No placeholders. Sign as 'Privacy User'.`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}