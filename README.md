# AI Photo Studio

An AI-powered photo editor featuring object replacement, outfit/clothing/accessories modification, background swapping, color modification, manual adjustments, filters, history step tracking, and bilingual UI support (English & Urdu).

## 🔒 API Key & Security Guide for GitHub

Your API keys are completely protected from accidental exposure:

1. **`.gitignore` configured**: `.env` and `.env.local` files containing your private API key (`GEMINI_API_KEY`) are excluded from Git commits by `.gitignore`.
2. **Server-Side API Route**: The Gemini API calls are made entirely on the backend (`/api/ai/edit-image` in `server.ts`). API keys are **never** exposed to the browser or client-side code.
3. **`.env.example` Template**: `.env.example` provides a clean placeholder for environment variables without revealing real keys.

---

## 🚀 Setup & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory (copied from `.env.example`):
```bash
cp .env.example .env
```
Add your Gemini API key inside `.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📤 Push to GitHub

To safely upload this repository to GitHub:

```bash
git init
git add .
git commit -m "Initial commit: AI Photo Studio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

> **Security Note:** `.env` will **NOT** be uploaded to GitHub because it is listed in `.gitignore`. Anyone cloning your project will copy `.env.example` to `.env` and insert their own API key.
