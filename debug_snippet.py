@router.get("/debug/slides")
def debug_slides(_=Depends(require_auth)):
    from generator import STATIC_SLIDES_DIR, FUNNELS_DIR
    res = {"static_exists": STATIC_SLIDES_DIR.exists(), "files": []}
    if STATIC_SLIDES_DIR.exists():
        for f in STATIC_SLIDES_DIR.glob("*.*"):
            res["files"].append(f.name)
    return res
