import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Momentum API", version="2.0.0", description="Personal Productivity OS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # single-server mode — all same origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, tasks, reminders, labels, timers, analytics, timetable

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(reminders.router)
app.include_router(labels.router)
app.include_router(timers.router)
app.include_router(analytics.router)
app.include_router(timetable.router)

@app.get("/health")
def health():
    return {"status": "ok", "app": "Momentum"}

# ── Serve frontend SPA (production mode) ────────────────────────────────────
_static = os.path.join(os.path.dirname(__file__), "static_dist")
if os.path.isdir(_static):
    # Serve static assets (JS, CSS, icons, sw.js, manifest…)
    app.mount("/assets", StaticFiles(directory=os.path.join(_static, "assets")), name="assets")

    # PWA files at root
    _pwa_files = ["manifest.webmanifest", "sw.js", "registerSW.js",
                  "icon.svg", "icon-192.png", "icon-512.png",
                  "workbox-*.js", "favicon.ico"]

    @app.get("/manifest.webmanifest")
    def manifest():
        return FileResponse(os.path.join(_static, "manifest.webmanifest"),
                            media_type="application/manifest+json")

    @app.get("/sw.js")
    def sw():
        return FileResponse(os.path.join(_static, "sw.js"),
                            media_type="application/javascript")

    @app.get("/registerSW.js")
    def register_sw():
        return FileResponse(os.path.join(_static, "registerSW.js"),
                            media_type="application/javascript")

    # All icon and static root files
    @app.get("/{filename:path}.png")
    def png_file(filename: str):
        path = os.path.join(_static, f"{filename}.png")
        if os.path.isfile(path):
            return FileResponse(path, media_type="image/png")
        return FileResponse(os.path.join(_static, "index.html"), media_type="text/html")

    @app.get("/{filename:path}.svg")
    def svg_file(filename: str):
        path = os.path.join(_static, f"{filename}.svg")
        if os.path.isfile(path):
            return FileResponse(path, media_type="image/svg+xml")
        return FileResponse(os.path.join(_static, "index.html"), media_type="text/html")

    # Catch-all SPA route — must be LAST
    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # Don't catch API routes (safety net)
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(404)
        return FileResponse(os.path.join(_static, "index.html"), media_type="text/html")
