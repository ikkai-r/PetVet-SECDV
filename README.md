# 🐶 PetVet

**PetVet** is a pet health management platform that helps pet owners **track their pets’ medical information, locate nearby veterinarians, and chat with an AI-powered vet assistant** for guidance and support.

Co-founded and launched with a focus on usability, accessibility, and early validation, PetVet integrates **Gemini AI** to provide conversational assistance while keeping humans (licensed vets) in the loop.

🔗 Live demo: [http://vet-visit-buddy.vercel.app](http://vet-visit-buddy.vercel.app)

---

## ✨ Features

### 🩺 Pet Health Management

* Store and manage pet profiles
* Track vaccinations, medications, and health history
* Centralized records for easier vet visits

### 📍 Vet Locator

* Find nearby veterinary clinics
* View basic clinic information and locations
* Designed to reduce friction during urgent situations

### 🤖 AI Vet Chat Assistant

* Conversational AI powered by **Gemini Chat API**
* Answers common pet health questions
* Provides guidance (not diagnoses) and next-step recommendations
* Designed as a **support tool**, not a replacement for licensed vets

### 🔐 Authentication & Data Storage

* Secure user authentication
* Cloud-based data storage with Firebase
* Real-time updates across sessions

---

## 🧱 Tech Stack

**Frontend**

* Next.js
* Tailwind CSS

**Backend**

* Node.js
* API-based architecture

**AI**

* Gemini Chat API

**Backend Services**

* Firebase (Authentication, Database)

---

## 🏗️ System Architecture (High-Level)

```text
Client (Next.js + Tailwind)
        |
        v
Node.js API Layer
        |
        +--> Firebase (Auth & Data)
        |
        +--> Gemini AI (Vet Chat)
        |
        v
Vet Locator Services
```

---

## ⚙️ Setup & Installation

### Prerequisites

* Node.js (v18+)
* Firebase project
* Gemini API access

### Installation

```bash
git clone <repository-url>
cd petvet
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
FIREBASE_API_KEY=your_key
GEMINI_API_KEY=your_key
```

### Run Locally

```bash
npm run dev
```

---

