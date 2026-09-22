# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import base64
import cv2
import numpy as np
import os
from ultralytics import YOLO

# Patch ultralytics AAttn block for YOLOv12 backwards compatibility if needed
try:
    from ultralytics.nn.modules import block
    _orig_aattn_forward = block.AAttn.forward
    def _patched_aattn_forward(self, x):
        if hasattr(self, 'qk'):
            B, _, H, W = x.shape
            N = H * W
            qk = self.qk(x).flatten(2).transpose(1, 2)
            v_tensor = self.v(x).flatten(2).transpose(1, 2)
            area = getattr(self, 'area', 1)
            if area > 1:
                qk = qk.reshape(B * area, N // area, self.all_head_dim * 2)
                v_tensor = v_tensor.reshape(B * area, N // area, self.all_head_dim)
                B, N, _ = qk.shape
            q, k = (
                qk.view(B, N, self.num_heads, self.head_dim * 2)
                .permute(0, 2, 3, 1)
                .split([self.head_dim, self.head_dim], dim=2)
            )
            v = v_tensor.view(B, N, self.num_heads, self.head_dim).permute(0, 2, 3, 1)
            attn = (q * (self.head_dim ** -0.5)).transpose(-2, -1) @ k
            attn = attn.softmax(dim=-1)
            x = v @ attn.transpose(-2, -1)
            x = x.permute(0, 3, 1, 2)
            v = v.permute(0, 3, 1, 2)
            if area > 1:
                x = x.reshape(B // area, N * area, self.all_head_dim)
                v = v.reshape(B // area, N * area, self.all_head_dim)
                B, N, _ = x.shape
            x = x.reshape(B, H, W, self.all_head_dim).permute(0, 3, 1, 2).contiguous()
            v = v.reshape(B, H, W, self.all_head_dim).permute(0, 3, 1, 2).contiguous()
            x = x + self.pe(v)
            return self.proj(x)
        return _orig_aattn_forward(self, x)
    block.AAttn.forward = _patched_aattn_forward
except Exception as patch_err:
    print(f"AAttn patch note: {patch_err}")

app = FastAPI()

# Enable CORS so the React app can talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.abspath("pothole_yolo_dataset/best.pt")
print(f"Loading local YOLO model from {MODEL_PATH}...")
try:
    model = YOLO(MODEL_PATH)
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model from {MODEL_PATH}: {e}")
    model = None

@app.post("/detect")
async def detect(request: Request):
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        # The React app sends the raw base64 string in the body
        body = await request.body()
        base64_str = body.decode('utf-8')
        
        # Decode base64 image
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        height, width, _ = img.shape

        # Run inference with tuned parameters for high recall & accuracy
        results = model(img, imgsz=640, conf=0.20, iou=0.45, verbose=False)

        # Format predictions with explicit top-left coordinates (x1, y1, width, height)
        predictions = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates (x1, y1: top-left, x2, y2: bottom-right)
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = box.conf[0].item()
                cls = int(box.cls[0].item())

                box_w = x2 - x1
                box_h = y2 - y1

                predictions.append({
                    "x": x1,
                    "y": y1,
                    "x1": x1,
                    "y1": y1,
                    "width": box_w,
                    "height": box_h,
                    "confidence": conf,
                    "class": model.names[cls]
                })

        return {
            "predictions": predictions,
            "image": {
                "width": width,
                "height": height
            }
        }
    except Exception as e:
        print(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
