# Delete My Data (Mini Chrome Extension)

A **very small example Chrome extension** that demonstrates how AI can be used to automate GDPR-style data deletion request emails directly from Gmail.

This project is meant for **learning, demos, and experimentation**, not as a full production-ready tool.

---

## ✨ What This Extension Does

- Works only on **Gmail**
- Takes a **Gemini API key** from the user
- Lets the user **select one or more companies**
- Uses **Gemini AI** to generate a short, professional data deletion email
- Automatically opens Gmail, fills recipient, subject, and body
- Sends the email on the user’s behalf

Think of it as a **proof-of-concept for privacy automation**.

---

## 🧠 Why This Exists

This extension was built as:
- A **learning example** for Chrome Extensions (Manifest V3)
- A **basic demo** of integrating Gemini API
- A **simple automation experiment** using Gmail DOM scripting

The code is intentionally kept small and readable.

---

## 🗂 Project Structure
├── manifest.json   # Chrome extension configuration
├── popup.html      # Extension UI
├── popup.js        # UI logic + Gemini API calls
├── companies.js    # Static list of companies and emails
├── content.js      # Gmail automation logic
├── styles.css      # Cyber-style UI

---

## ⚙️ How It Works (Simple Flow)

1. Open **Gmail**
2. Click the extension
3. Paste your **Gemini API key**
4. Select target companies
5. Click **INITIATE SEQUENCE**
6. Emails are generated and sent automatically

---

## 🔐 Permissions Explained

- `activeTab` – interact with the current Gmail tab  
- `scripting` – inject automation logic into Gmail  
- `storage` – save Gemini API key locally  
- `mail.google.com` – required to automate Gmail UI  

No data is sent anywhere except **directly to Gemini API**.

---

## ⚠️ Important Notes

- This is a **demo extension**
- Gmail UI changes may break automation
- API rate limits are handled with delays
- Not affiliated with Google, Gemini, or any company listed
- Use responsibly and only for legitimate requests

---

## 🚀 Future Improvements (Optional)

- Dynamic company database
- Manual email preview before sending
- OAuth instead of API key input
- Multi-language support
- Error handling for Gmail UI changes

---

## 📚 Educational Purpose

This project is intended for:
- Students
- Hackathon demos
- Chrome extension beginners
- AI + automation experiments

---

## 🧑‍💻 Author

**Manthan Darji**  
Computer Engineering Student  
Privacy • Automation • AI Experiments
