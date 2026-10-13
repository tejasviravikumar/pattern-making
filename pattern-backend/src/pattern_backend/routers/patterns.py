from typing import Literal
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from ..cv import CVError, image_to_outline_cm
from ..pattern import build_pattern
from ..schemas import GarmentType, Pattern

MAX_UPLOAD_BYTES = 10*1024*1024
router = APIRouter(prefix="/patterns",tags=["patterns"])
@router.post("/generate",response_model=Pattern)
async def generate(
    image: UploadFile = File(...),
    garment_type: GarmentType = Form("top"),
    reference_cm: float | None = Form(None,gt=0, le=300),
    reference_axis:Literal["width","height"] = Form("width"),
    seam_allowance_cm: float = Form(1.5,ge=0,le=5)
):
    data = await image.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413,"Image is too large (max 10 MB).")

    try:
        outline_cm , cm_per_px, assumed = image_to_outline_cm(data,reference_cm, reference_axis)
    except CVError as e:
        raise HTTPException(422,str(e))

    return build_pattern(outline_cm, garment_type, seam_allowance_cm,cm_per_px,assumed)



