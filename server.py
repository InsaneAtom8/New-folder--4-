# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import base64
import cv2
import numpy as np
from ultralytics import YOLO

app = FastAPI()

# Enable CORS so the React app can talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading local YOLOv8 model...")
try:
    model = YOLO("runs/detect/rdd2022_d40_pothole_model/high_accuracy_run-4/weights/best.pt")
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
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

        # Run inference (suppress console output for speed)
        results = model(img, verbose=False)

        # Format predictions exactly like Roboflow expects
        predictions = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = box.conf[0].item()
                cls = int(box.cls[0].item())

                # Roboflow expects center x, center y, width, height in pixels
                box_w = x2 - x1
                box_h = y2 - y1
                box_cx = x1 + (box_w / 2)
                box_cy = y1 + (box_h / 2)

                predictions.append({
                    "x": box_cx,
                    "y": box_cy,
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
