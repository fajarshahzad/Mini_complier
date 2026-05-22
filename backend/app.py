from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.auth.database import Base, engine
from backend.auth.auth import router as auth_router
from backend.routes.compiler import router as compiler_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mini Pascal Compiler API")

# CORS middleware to allow connection from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(compiler_router)

@app.get("/")
def home():
    return {
        "status": "online",
        "message": "Mini Pascal Compiler API is running. Use /auth and /compiler routes."
    }