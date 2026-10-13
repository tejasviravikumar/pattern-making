from typing import Literal
from pydantic import BaseModel

Point = tuple[float,float]
GarmentType = Literal["top","dress","skirt","trousers"]

class Marking(BaseModel):
    id:str
    type:Literal["grainline","notch","dart"]
    points:list[Point]
    label:str | None = None
    auto:bool = True

class Piece(BaseModel):
    id:str
    name:str
    outline:list[Point]
    seam_allowance:list[Point]
    markings:list[Marking]
    width_cm:float
    height_cm:float

class Pattern(BaseModel):
    units:Literal["cm"]="cm"
    garment_type:GarmentType
    pieces:list[Piece]
    scale_cm_per_px:float
    scale_assumed:bool
    warnings:list[str]=[]