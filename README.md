# Ridder 📦

Ridder is an automated batch asset clustering and AI listing generation workspace. It is built to save time when listing and getting rid of pre-owned items on retail marketplaces (such as Vinted). 

Rather than manually creating separate listings for dozens of items, sellers can upload all photos in a single batch. Ridder uses computer vision and multimodal AI models to group photos of the same physical item together and generate complete, copy-pasteable product listings.

---

## Key Features ✨

- **Joint Visual Clustering 🧩:** Processes flat folders of unstructured photos, detecting which images are different angles, tags, or details of the same physical item, and automatically grouping them into logical lots.
- **Multimodal Listing Generation 🤖:** Leverages Gemini models to inspect item images, identify the brand, size, and condition, estimate measurements, and write localized, SEO-ready product descriptions and tags.
- **Configurable Pricing Profiles 🏷️:**
  - **Vinted Frugal:** Low, conservative bargain pricing optimized for price-sensitive buyers (defaulting listings to low ranges like 5 - 25 units).
  - **Standard Secondhand:** Balanced, competitive market value.
  - **Premium Resale:** High-end, optimistic listing prices.
- **Localized Currencies 🌍:** Full support for USD ($), EUR (€), HRN (₴), and PLN (zł).
- **Interactive Review Board 📋:** A minimal frontend workspace to manually inspect, merge, or split visual clusters before executing AI generation.
- **Copy-Paste Optimization 📋:** Generates ready-to-use plaintext listings and structured JSON payloads for rapid listing deployment.

---

## Tech Stack 🛠️

### Frontend 🎨
- **Framework:** Next.js (React, Client-Side Rendering)
- **Styling:** Tailwind CSS / Vanilla CSS (Modern Dark Mode / shadcn/ui components)
- **Icons:** Lucide React
- **Client Utilities:** Custom local storage hooks for local-first settings storage (API Keys, model options, currencies, and pricing strategies are stored entirely browser-side).

### Backend ⚙️
- **Framework:** FastAPI (Python 3.13)
- **API Engine:** Google GenAI SDK (Gemini Developer API Integration)
- **Image Processing:** Pillow (PIL) for aspect-ratio preservation, downscaling (max 1024px), and compressed JPEG serialization to minimize LLM token usage and latency.

### Deployment & Orchestration 🚢
- **Docker Compose:** Multi-stage Docker builds orchestrating Next.js node server and FastAPI python server.

---

## Getting Started 🚀

### Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose installed.
- A **Google Gemini API Key** (obtainable via Google AI Studio).

### Setup and Running with Docker
The easiest way to start both services is through Docker Compose:

```bash
docker compose up --build
```

- **Frontend Application:** accessible at `http://localhost:3000`
- **FastAPI Backend Server:** running at `http://localhost:8000`

---

## Development Setup (Running Locally) 💻

If you prefer to run the components directly on your host machine:

### 1. Backend Setup
1. Navigate to the `/backend` directory.
2. Initialize and activate a virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --port 8000
   ```

### 2. Frontend Setup
1. From the project root, install Node dependencies:
   ```bash
   npm install
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```

---

## How to Use 📖

1. Open `http://localhost:3000` in your browser.
2. Click the **System Settings** icon (gear symbol in the top right).
3. Paste your **Gemini API Key**, select your preferred model (e.g., `gemini-2.5-flash`), select your target **Currency**, and set your **Pricing Strategy Profile** (e.g., `Vinted Frugal`). Click **Save Changes**.
4. Drag and drop or upload all of your clothing pictures into the upload zone.
5. Review the grouped lots on the board. You can select individual thumbnail photos to preview detail metadata, click **Split** (scissors icon) to separate an image into a new lot, or click **Merge Up** to join a lot with the one above it.
6. Click **AI Auto-List** to run visual grouping and listing generation in a single batch, or click **Generate** on an individual lot card.
7. Click **Copy Listing (Text + JSON)** to copy the market-ready description to your clipboard for quick listing creation.
