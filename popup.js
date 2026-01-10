document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('company-list');
    const nukeBtn = document.getElementById('nukeBtn');
    const statusDiv = document.getElementById('status');
    const apiKeyInput = document.getElementById('apiKey');

    // 1. Load Companies into UI
    TARGETS.forEach((company, index) => {
        const div = document.createElement('div');
        div.className = 'company-item';
        div.innerHTML = `
            <input type="checkbox" id="comp-${index}" value="${index}">
            <label for="comp-${index}" style="margin:0; cursor:pointer;">${company.name}</label>
        `;
        listContainer.appendChild(div);
    });

    // 2. Main Logic
    nukeBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            updateStatus("Error: API Key Required!", true);
            return;
        }

        // Get selected companies
        const checkedBoxes = document.querySelectorAll('#company-list input:checked');
        if (checkedBoxes.length === 0) {
            updateStatus("Error: No Targets Selected!", true);
            return;
        }

        nukeBtn.disabled = true;
        
        // Loop through selected companies (Sequential Execution)
        for (let i = 0; i < checkedBoxes.length; i++) {
            const index = checkedBoxes[i].value;
            const company = TARGETS[index];
            
            updateStatus(`Processing: ${company.name}...`);

            try {
                // A. Generate Email Content using Gemini
                const emailContent = await generateEmailWithGemini(apiKey, company.name);
                
                // B. Inject into Gmail
                await injectIntoGmail(company.email, "Data Deletion Request - GDPR/DPDP", emailContent);
                
                // Wait a bit between emails so Gmail doesn't freak out
                await new Promise(r => setTimeout(r, 3000)); 
                
            } catch (error) {
                console.error(error);
                updateStatus(`Failed: ${company.name}`, true);
            }
        }

        updateStatus("MISSION COMPLETE. CHECK DRAFTS.", false);
        nukeBtn.disabled = false;
    });

    function updateStatus(msg, isError = false) {
        statusDiv.textContent = msg;
        statusDiv.style.color = isError ? '#ff4444' : '#00ff41';
    }
});

// --- GEMINI API CALL ---
async function generateEmailWithGemini(apiKey, companyName) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `Write a strictly professional, concise email to ${companyName} requesting the deletion of all my personal data under GDPR and Indian DPDP laws. Return ONLY the body text. No subject line. No placeholders. Sign it as 'Concerned User'.`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// --- CONTENT SCRIPT INJECTION ---
async function injectIntoGmail(to, subject, body) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes("mail.google.com")) {
        throw new Error("Not on Gmail!");
    }

    return chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fillGmailDraft,
        args: [to, subject, body]
    });
}

// --- DOM MANIPULATION FUNCTION (Runs inside the page) ---
function fillGmailDraft(recipient, subjectLine, bodyText) {
    return new Promise((resolve) => {
        // 1. Click Compose
        const composeBtn = document.querySelector('div[role="button"][gh="cm"]');
        if (!composeBtn) {
            alert("Error: Can't find Compose button. Make sure Gmail is fully loaded.");
            return;
        }
        composeBtn.click();

        // Wait for the popup to open
        setTimeout(() => {
            // 2. Select Fields
            // Note: Gmail selectors change often. We use attribute selectors which are more stable.
            const toField = document.querySelector('input[peoplekit-id]') || document.querySelector('div[name="to"] input'); 
            const subjectField = document.querySelector('input[name="subjectbox"]');
            const bodyField = document.querySelector('div[aria-label="Message Body"]');

            if (toField && subjectField && bodyField) {
                // Fill To (This is tricky in Gmail, we simulate typing)
                // However, for hackathon, let's try setting value and hitting enter if possible, 
                // or just focus and execCommand.
                
                // Strategy: Use document.execCommand for body (simulates pasting)
                // Fill Subject
                subjectField.value = subjectLine;
                
                // Fill Body
                bodyField.focus();
                document.execCommand('insertText', false, bodyText);

                // Fill Recipient - Focus and paste
                // Note: Automating the 'To' field is the hardest part due to Gmail's chips.
                // We will try to set the value in the visible input.
                const toInput = document.querySelector('div[name="to"] input') || document.querySelector('textarea[name="to"]');
                if(toInput) {
                    toInput.focus();
                    document.execCommand('insertText', false, recipient);
                    // Simulate Enter key to solidify the chip (optional/complex)
                }
                
                resolve("Filled");
            } else {
                console.error("DOM Error: Fields not found");
                resolve("Error");
            }
        }, 1000); // 1 second wait for compose window
    });
}