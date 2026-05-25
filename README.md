# AI Road Accident Prediction

This repo is structured as a monorepo:

- `backend/` contains the FastAPI API and model code
- `frontend/` contains the React + Vite website
- `app.py` and `App.py` are thin wrappers for local compatibility

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` in `frontend/.env` if your backend is running on a different URL.

## Vercel Deployment

Deploy the repo as two Vercel projects from the same GitHub repository:

1. **Backend project**
   - Root Directory: `backend`
   - Framework: FastAPI
   - Vercel will use `backend/app.py` as the app entrypoint

2. **Frontend project**
   - Root Directory: `frontend`
   - Framework: Vite
   - Set `VITE_API_BASE_URL` to the backend deployment URL

Vercel supports FastAPI apps through its Python runtime, and monorepos are supported as separate app roots.

## Notes

- The model trains from `accident_data.csv` and caches the trained artifact in `backend/artifacts/`.
- The frontend is intentionally framework-only and does not depend on Streamlit.

