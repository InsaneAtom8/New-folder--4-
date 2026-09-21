import sys
import os

def check_and_install_dependencies():
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[Setup] Installing ultralytics, torch, and opencv dependencies...")
        os.system(f"{sys.executable} -m pip install --break-system-packages ultralytics opencv-python torch torchvision")

def train_model():
    check_and_install_dependencies()
    from ultralytics import YOLO

    yaml_path = os.path.abspath("pothole_yolo_dataset/Pothole.yolov8/data.yaml")
    print("\n" + "="*60)
    print(f"  Training YOLOv8 Custom Model")
    print(f"  Dataset Config: {yaml_path}")
    print("="*60 + "\n")

    # Load pretrained YOLOv8 Medium model for high accuracy & recall
    model = YOLO("yolov8m.pt")

    results = model.train(
        data=yaml_path,
        epochs=50,             # 50 epochs for high accuracy convergence
        imgsz=640,             # 640x640 resolution
        batch=16,
        save=True,
        project="runs/detect/rdd2022_d40_pothole_model",
        name="high_accuracy_run-4",
        exist_ok=True,
    )

    print("\n" + "="*60)
    print("  Training Completed Successfully!")
    print("  Best weights saved to:")
    print("  runs/detect/rdd2022_d40_pothole_model/high_accuracy_run-4/weights/best.pt")
    print("="*60 + "\n")

if __name__ == "__main__":
    train_model()
