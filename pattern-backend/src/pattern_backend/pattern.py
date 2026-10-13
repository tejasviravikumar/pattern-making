"""Outline (cm) -> pattern: seam allowance, grainline, notches and rule-based darts."""
import numpy as np
from shapely.geometry import LineString, MultiPolygon, Polygon

from .schemas import GarmentType, Marking, Pattern, Piece


def _clean_polygon(points_cm: np.ndarray) -> Polygon:
    poly = Polygon(points_cm)
    if not poly.is_valid:
        poly = poly.buffer(0)
    if isinstance(poly, MultiPolygon):
        poly = max(poly.geoms, key=lambda p: p.area)
    return poly


def _coords(geom) -> list[tuple[float, float]]:
    return [(round(x, 2), round(y, 2)) for x, y in geom.exterior.coords]


def _y_range_at(poly: Polygon, x: float):
    hit = poly.intersection(LineString([(x, -1), (x, poly.bounds[3] + 1)]))
    if hit.is_empty:
        return None
    _, y0, _, y1 = hit.bounds
    return y0, y1


def _x_range_at(poly: Polygon, y: float):
    hit = poly.intersection(LineString([(poly.bounds[0] - 1, y), (poly.bounds[2] + 1, y)]))
    if hit.is_empty:
        return None
    x0, _, x1, _ = hit.bounds
    return x0, x1


def _grainline(w: float, h: float) -> Marking:
    x = round(w / 2, 2)
    return Marking(id="grain", type="grainline",
                   points=[(x, round(h * 0.25, 2)), (x, round(h * 0.75, 2))],
                   label="Grainline")


def _side_notches(poly: Polygon, w: float, h: float) -> list[Marking]:
    """Matching notches halfway down both side seams (help align front/back when sewing)."""
    xr = _x_range_at(poly, h * 0.5)
    if not xr:
        return []
    x0, x1 = xr
    depth = 0.8
    return [
        Marking(id="notch_l", type="notch",
                points=[(round(x0, 2), round(h * 0.5, 2)), (round(x0 + depth, 2), round(h * 0.5, 2))]),
        Marking(id="notch_r", type="notch",
                points=[(round(x1, 2), round(h * 0.5, 2)), (round(x1 - depth, 2), round(h * 0.5, 2))]),
    ]


def _bust_dart(poly: Polygon, w: float, h: float) -> list[Marking]:
    """Side-seam bust dart on the left edge, pointing toward the bust. Approximate: user adjusts."""
    y = h * 0.32
    xr = _x_range_at(poly, y)
    if not xr:
        return []
    x0, _ = xr
    half_intake = 1.5  # dart is 3 cm wide at the seam
    apex = (round(x0 + w * 0.30, 2), round(y + 1.0, 2))
    return [Marking(id="dart_bust", type="dart",
                    points=[(round(x0, 2), round(y - half_intake, 2)), apex,
                            (round(x0, 2), round(y + half_intake, 2))],
                    label="Bust dart (auto-placed)")]


def _waist_darts(poly: Polygon, w: float, h: float) -> list[Marking]:
    """Two vertical darts at the waistline of a skirt."""
    darts = []
    for i, frac in enumerate((0.30, 0.70)):
        x = w * frac
        yr = _y_range_at(poly, x)
        if not yr:
            continue
        top = yr[0]
        half_intake = 1.0  # 2 cm wide
        length = min(12.0, h * 0.35)
        darts.append(Marking(id=f"dart_waist_{i + 1}", type="dart",
                             points=[(round(x - half_intake, 2), round(top, 2)),
                                     (round(x, 2), round(top + length, 2)),
                                     (round(x + half_intake, 2), round(top, 2))],
                             label="Waist dart (auto-placed)"))
    return darts


def build_pattern(outline_cm: np.ndarray, garment_type: GarmentType,
                  seam_allowance_cm: float, cm_per_px: float, scale_assumed: bool) -> Pattern:
    poly = _clean_polygon(outline_cm)
    minx, miny, maxx, maxy = poly.bounds
    w, h = maxx - minx, maxy - miny

    cutting_line = poly.buffer(seam_allowance_cm, join_style=2, mitre_limit=2.0)

    markings = [_grainline(w, h)] + _side_notches(poly, w, h)
    if garment_type in ("top", "dress"):
        markings += _bust_dart(poly, w, h)
    elif garment_type == "skirt":
        markings += _waist_darts(poly, w, h)

    piece = Piece(
        id="piece_1",
        name=f"{garment_type.capitalize()} (traced)",
        outline=_coords(poly),
        seam_allowance=_coords(cutting_line),
        markings=markings,
        width_cm=round(w, 1),
        height_cm=round(h, 1),
    )

    warnings = []
    if scale_assumed:
        warnings.append(
            "No reference measurement given, so the garment width was assumed to be 50 cm. "
            "Enter a real measurement for correct sizing.")
    warnings.append("Darts and notches are placed by general rules, so check and adjust them in the editor.")
    return Pattern(garment_type=garment_type, pieces=[piece], scale_cm_per_px=round(cm_per_px, 5),
                   scale_assumed=scale_assumed, warnings=warnings)