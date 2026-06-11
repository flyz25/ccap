from fastapi import APIRouter

from app.api.routes import auth, dashboard, ecc, ketepuan, map, optimum, population, upload, zoning


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(ecc.router)
api_router.include_router(zoning.router)
api_router.include_router(optimum.router)
api_router.include_router(ketepuan.router)
api_router.include_router(population.router)
api_router.include_router(map.router)
api_router.include_router(upload.router)

