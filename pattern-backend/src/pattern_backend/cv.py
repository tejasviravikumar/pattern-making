"""Image -> clean outline in centimetres. Knows about shapes only, nothing about sewing."""
import cv2
import numpy as np

MAX_SIDE = 1200          # photos are downscaled to this for speed
DEFAULT_WIDTH_CM = 50.0  # used when the user gives no reference measurement


class CVError(Exception):
    """Raised with a user-friendly message when the photo can't be processed."""


def decode_image(data: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise CVError("Could not read the image. Please upload a JPG or PNG photo.")
    h, w = img.shape[:2]
    scale = MAX_SIDE / max(h, w)
    if scale < 1:
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return img


def segment_garment(img: np.ndarray) -> np.ndarray:
    """Binary mask of the garment. Assumes a fairly plain background (flat-lay photo)."""
    lab = cv2.cvtColor(cv2.GaussianBlur(img, (5, 5), 0), cv2.COLOR_BGR2LAB).astype(np.float32)
    h, w = lab.shape[:2]
    b = max(5, int(min(h, w) * 0.03))
    border = np.concatenate([
        lab[:b].reshape(-1, 3), lab[-b:].reshape(-1, 3),
        lab[:, :b].reshape(-1, 3), lab[:, -b:].reshape(-1, 3),
    ])
    background = np.median(border, axis=0)          # typical background colour
    dist = np.linalg.norm(lab - background, axis=2)  # how far each pixel is from it
    dist8 = cv2.normalize(dist, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    _, mask = cv2.threshold(dist8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)  # fill small gaps
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)                 # drop specks
    return mask


def extract_outline(mask: np.ndarray) -> np.ndarray:
    """Largest outer contour, simplified to a manageable polygon (N x 2, pixels)."""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        raise CVError("No garment found. Use a plain background and lay the garment flat.")
    biggest = max(contours, key=cv2.contourArea)
    fraction = cv2.contourArea(biggest) / float(mask.shape[0] * mask.shape[1])
    if fraction < 0.03:
        raise CVError("The garment looks too small in the photo. Move closer so it fills the frame.")
    if fraction > 0.97:
        raise CVError("Could not separate the garment from the background. Try a plain, contrasting background.")
    epsilon = 0.0015 * cv2.arcLength(biggest, True)
    return cv2.approxPolyDP(biggest, epsilon, True).reshape(-1, 2).astype(np.float64)


def to_centimetres(points_px: np.ndarray, reference_cm: float | None, axis: str):
    """Scale pixels to cm and move the shape so its top-left corner is (0, 0).
    Returns (points_cm, cm_per_px, scale_was_assumed)."""
    mins, maxs = points_px.min(axis=0), points_px.max(axis=0)
    width_px, height_px = maxs - mins
    if reference_cm:
        cm_per_px = reference_cm / (width_px if axis == "width" else height_px)
        assumed = False
    else:
        cm_per_px = DEFAULT_WIDTH_CM / width_px
        assumed = True
    return (points_px - mins) * cm_per_px, float(cm_per_px), assumed


def image_to_outline_cm(data: bytes, reference_cm: float | None = None, axis: str = "width"):
    img = decode_image(data)
    mask = segment_garment(img)
    outline_px = extract_outline(mask)
    return to_centimetres(outline_px, reference_cm, axis)