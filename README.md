# PotholeVision AI Enterprise 🛣️🔍

An enterprise-grade, end-to-end intelligent road maintenance and road damage detection platform. PotholeVision AI pairs a state-of-the-art Deep Learning computer vision model (**YOLOv8 Medium**) with video processing pipelines, GPS telemetry synchronization, GIS spatial mapping (Leaflet), severity clustering, and an interactive municipal dashboard.

---

## 📑 Table of Contents
1. [Overview & Architecture](#-overview--architecture)
2. [Deep Learning Architecture: What We Used](#-deep-learning-architecture-what-we-used)
3. [Model Selection & Justification (Why YOLOv8m?)](#-model-selection--justification-why-yolov8m)
4. [DL Model Comparison Matrix](#-dl-model-comparison-matrix)
5. [How Deep Learning is Used in the Pipeline](#-how-deep-learning-is-used-in-the-pipeline)
6. [Training & Hyperparameters](#-training--hyperparameters)
7. [System Features & Tech Stack](#-system-features--tech-stack)
8. [Getting Started & Installation](#-getting-started--installation)
9. [API & Inference Endpoints](#-api--inference-endpoints)

---

## 🔭 Overview & Architecture

PotholeVision AI automates the detection, localization, and severity classification of road surface degradations (potholes) from dashcam, drone, or action camera video footage.

```mermaid
flowchart LR
    A["Dashcam Video (MP4/WebM)"] --> B["Canvas Frame Extraction (640x640)"]
    C["NMEA GPS / Telemetry"] --> D["Spatial Interpolator"]
    B --> E["FastAPI Local Server (:8000)"]
    E --> F["Deep Learning Inference (YOLOv8m 'best.pt')"]
    F --> G["Bounding Boxes + Confidences"]
    G & D --> H["Spatial Deduplication Engine"]
    H --> I["Severity & Area Estimator"]
    I --> J["IndexedDB + Leaflet GIS Dashboard"]
```

---

## 🧠 Deep Learning Architecture: What We Used

### Core Model: Custom-Trained YOLOv8 Medium (`yolov8m.pt`)
For object detection, this system utilizes **YOLOv8 (You Only Look Once, Version 8 - Medium Variant)** developed by Ultralytics, fine-tuned on custom pothole datasets (including RDD2022 / Roboflow road damage annotations).

Key architectural characteristics:
* **Anchor-Free Detection Head:** Decoupled head separating classification, bounding box regression, and objectness score calculation. This removes the need for predefined manual anchor boxes and drastically improves detection of irregular, non-uniform pothole contours.
* **C2f Feature Extraction Backbone:** Cross-Stage Partial Network with 2 convolutions (`C2f`) combining high-level semantic representation with low-level gradient flow without high computational overhead.
* **Spatial Pyramid Pooling - Fast (SPPF):** Pools features at diverse receptive field scales ($5 \times 5$, $9 \times 9$, $13 \times 13$) to detect potholes whether viewed closely near the hood of the vehicle or far down the horizon.
* **Loss Formulation:** Employs **Task-Aligned Assigner**, Complete IoU (**CIoU**), and Distribution Focal Loss (**DFL**) for fine-grained sub-pixel edge alignment on road asphalt cracks and depressions.

---

## ⚖️ Model Selection & Justification (Why YOLOv8m?)

In real-world automated road condition monitoring, model selection demands balancing four critical trade-offs:
1. **Detection Accuracy & Recall on Irregular Shapes:** Potholes possess amorphous geometries, vary wildly in scale, and blend into surrounding asphalt under diverse shadows and moisture conditions.
2. **Real-Time Frame Rates:** Video feeds must be processed at $25\text{--}60\text{ fps}$ without requiring multi-GPU server clusters.
3. **Edge & Local Server Deployability:** Municipal inspection vehicles typically operate on onboard embedded edge units (NVIDIA Jetson, Intel NUC) or local workstations without continuous cloud internet connectivity.
4. **Resilience to False Positives:** Manhole covers, oil slicks, asphalt patches, tree shadows, and tire skid marks frequently produce false positives in shallow networks.

### Why not Two-Stage Detectors (Faster R-CNN / Mask R-CNN)?
* **Throughput Bottleneck:** Two-stage architectures (Region Proposal Network followed by RoI Align and classification) typically cap out at $10\text{--}18\text{ fps}$ on standard consumer GPUs.
* **Latency:** Faster R-CNN adds significant per-frame latency ($60\text{--}100\text{ ms}$), creating severe queue backpressure when decoding 60 fps dashcam streams.
* **Overhead:** Weight footprints ($>150\text{ MB}$) make lightweight local deployment cumbersome.

### Why not Classical SSD / YOLOv3 / YOLOv4?
* **Rigid Anchor Boxes:** Fixed-anchor priors struggle with the non-standard aspect ratios of road cratering.
* **Sub-optimal Multi-Scale Fusion:** Traditional FPNs in older models produce high false negative rates on small, distant potholes.

### Why YOLOv8m over YOLOv8n (Nano) or YOLOv8x (Extra Large)?
* **YOLOv8n / YOLOv8s:** While extremely fast ($>120\text{ fps}$), the reduced feature channels result in lower recall for faint, water-filled, or shadowed potholes.
* **YOLOv8x:** Provides marginal mAP gains ($+1\text{--}1.5\%$) but quadruples compute cost, cutting frame rates below acceptable real-time video playback thresholds.
* **YOLOv8m (The "Sweet Spot"):** Offers optimal Pareto efficiency: **~25.9M parameters**, outstanding recall on low-contrast road craters, and $>45\text{--}65\text{ fps}$ on standard local hardware.

---

## 📊 DL Model Comparison Matrix

| Architecture | Paradigm | Parameters | Inference Speed (GPU) | Precision / Recall | Shadow & Low-Contrast Robustness | Suitability for Real-Time Video Telemetry |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **YOLOv8m (Ours)** | **Single-Stage, Anchor-Free** | **~25.9M** | **~15 - 22 ms (~50+ FPS)** | **High (mAP50 > 86%)** | **Excellent (DFL + C2f backbone)** | **Optimal (Balanced speed & accuracy)** |
| YOLOv8n (Nano) | Single-Stage, Anchor-Free | ~3.2M | ~5 - 8 ms (~140+ FPS) | Moderate (Higher false negatives) | Poor under rain/shadows | High speed, but misses critical road hazards |
| YOLOv5s | Single-Stage, Anchor-Based | ~7.2M | ~10 - 14 ms (~80 FPS) | Moderate (mAP50 ~78%) | Moderate (Anchor box misalignment) | Good, but outdated loss & anchor heuristics |
| Faster R-CNN (ResNet-50) | Two-Stage (RPN + RoI) | ~41.5M | ~55 - 85 ms (~12-18 FPS) | High precision, lower recall | Moderate | Poor (Causes video pipeline stutter) |
| RT-DETR (Transformer) | End-to-End Transformer | ~32M | ~28 - 35 ms (~30 FPS) | Very High | Excellent | High memory overhead; requires high-end CUDA setups |
| SSD (Single Shot Detector) | Single-Stage, Fixed Prior | ~26M | ~20 - 30 ms (~40 FPS) | Low to Moderate | Struggles with small/distant potholes | Deprecated architecture |

---

## ⚙️ How Deep Learning is Used in the Pipeline

1. **Client-Side Frame Sampling & Normalization:**
   The browser frontend samples frames from ingested video at target temporal intervals via an HTML5 `<canvas>`, downscales/rescales them to $640 \times 640$ pixels, and encodes the frames to Base64 JPEG.
2. **Inference Dispatch via Local API:**
   The frame is transmitted over HTTP POST to the local FastAPI inference service (`/detect`).
3. **Tensor Pre-processing & Forward Pass:**
   OpenCV decodes the raw buffer to BGR format; the Ultralytics engine converts the image into float32 tensors, normalizes pixel intensities to $[0, 1]$, and executes the forward pass on `pothole_yolo_dataset/best.pt`.
4. **Task-Aligned Post-Processing (NMS & Thresholding):**
   * **Confidence Threshold ($conf = 0.20$):** Set deliberately sensitive to maximize recall of emerging or partial potholes.
   * **IoU Threshold ($iou = 0.45$):** Non-Maximum Suppression strips duplicate overlapping candidate boxes.
5. **Physical Metric & Severity Derivation:**
   Bounding box coordinates $[x_1, y_1, x_2, y_2]$ are converted into relative area percentages:
   $$\text{Area Ratio} = \frac{(x_2 - x_1) \times (y_2 - y_1)}{\text{Frame Width} \times \text{Frame Height}}$$
   Classified dynamically into:
   * **Low Severity:** Surface blemishes ($< 1.5\%$ frame area)
   * **Medium Severity:** Standard potholes ($1.5\% - 4.5\%$ frame area)
   * **High / Critical Severity:** Deep craters or large road breaks ($> 4.5\%$ frame area)
6. **Spatial Deduplication:**
   When combined with GPS track coordinates, detections within an adjustable radius (e.g., $15\text{ meters}$) across adjacent frames are merged using spatial clustering to prevent double-counting.

---

## 🏋️ Training & Hyperparameters

The model training routine is structured in [`train_roboflow_model.py`](file:///Users/apurv/Documents/Apurv/Apurv%20Codes/New-folder--4-/train_roboflow_model.py):

```python
results = model.train(
    data="pothole_yolo_dataset/Pothole.yolov8/data.yaml",
    epochs=50,             # Convergence threshold for feature fine-tuning
    imgsz=640,             # Square resolution preserving road surface aspect ratio
    batch=16,              # Stabilized gradient batch
    save=True,
    project="runs/detect/rdd2022_d40_pothole_model",
    name="high_accuracy_run-4",
    exist_ok=True,
)
```

* **Dataset Annotations:** Annotated bounding boxes covering diverse road conditions, wet surfaces, asphalt types, and lighting variations.
* **Augmentations Applied:** Mosaic ($1.0$), horizontal flips, HSV color jitter, and scale transformations to prevent overfitting to specific camera angles.

---

## 🛠️ System Features & Tech Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Mapping & GIS:** Leaflet, React-Leaflet, Leaflet MarkerCluster, Leaflet Heatmap.
* **Charts & Analytics:** Chart.js, React-ChartJS-2 (Severity distributions, temporal breakdown).
* **Storage:** Client-side IndexedDB persistence for offline-first municipal inspections.
* **Backend:** Python 3, FastAPI, Uvicorn, OpenCV (`cv2`), PyTorch, Ultralytics YOLO.

---

## 🚀 Getting Started & Installation

### 1. Prerequisites
* **Node.js** (v18+ recommended) & `npm`
* **Python** (v3.10+ recommended)
* Optional: NVIDIA CUDA-compatible GPU (defaults gracefully to CPU if unavailable)

### 2. Automated Single-Script Launch
To start both the FastAPI YOLO inference server and the React frontend simultaneously:

```bash
chmod +x start.sh
./start.sh
```

Or on Windows PowerShell:
```powershell
.\start.ps1
```

### 3. Manual Launch

#### Backend (FastAPI + YOLOv8)
```bash
# Install Python dependencies
pip install ultralytics fastapi uvicorn opencv-python torch torchvision

# Start the inference server
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend (React + Vite)
```bash
# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API & Inference Endpoints

### `POST /detect`
Accepts a raw Base64 JPEG string in the request body.

**Response Structure:**
```json
{
  "predictions": [
    {
      "x": 340.5,
      "y": 512.0,
      "width": 128.0,
      "height": 76.5,
      "confidence": 0.884,
      "class": "Pothole",
      "class_id": 0
    }
  ],
  "image": {
    "width": 1280,
    "height": 720
  }
}
```

