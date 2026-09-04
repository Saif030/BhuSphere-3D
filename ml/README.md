# ML architecture (prototype → production)
- Extraction: drone/sat/LiDAR/DEM → preprocessing → building detection → footprint → height → floors → 3D volumes.
  Prototype: procedural geometry + deterministic rules in `backend/app/validation.py`. Swap with PyTorch/OpenCV/Open3D/PDAL models.
- Validation: 12 topology rules (overlap, outside-parcel, floor overlap, missing floor, height mismatch, duplicates, utility crossing…) + confidence 95/80/60.
- Copilot: NL → safe tool calls in `aicopilot.py` (no raw SQL). Production: LangGraph + pgvector RAG over approvals/floor-plans/surveys.
