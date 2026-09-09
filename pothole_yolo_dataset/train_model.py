# High-Accuracy RDD2022 Custom D40 Pothole Model Training Script
# Optimized for maximum recall & mAP50 to prevent missed potholes

from ultralytics import YOLO

def train_custom_d40_model():
    # Load lightweight YOLOv8 Nano model optimized for high-speed CPU training
    model = YOLO('yolov8n.pt')

    print("=== Training RDD2022 Custom D40 High-Accuracy Pothole Model ===")
    results = model.train(
        data=r'c:\Users\Manali\OneDrive\Desktop\New folder (4)\pothole_yolo_dataset\data.yaml',
        epochs=30,                # 30 epochs for fast CPU completion
        imgsz=416,                # 416x416 resolution for fast CPU execution
        batch=4,
        workers=0,                # 0 workers for stable Windows multiprocessing
        device='cpu',             # CPU execution optimization
        lr0=0.01,
        lrf=0.01,
        momentum=0.937,
        weight_decay=0.0005,
        warmup_epochs=3.0,
        
        # High Augmentation for Varied Road/Lighting conditions
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        shear=2.0,
        perspective=0.0005,
        flipud=0.0,
        fliplr=0.5,
        mosaic=1.0,               # Mosaic augmentation crucial for small potholes
        mixup=0.15,               # Blends images to avoid overfitting
        
        # Loss gain tuning
        box=7.5,
        cls=0.5,
        dfl=1.5,
        
        # Save model checkpoints
        save=True,
        project='rdd2022_d40_pothole_model',
        name='high_accuracy_run',
    )
    print("Training finished! Best model weights saved at: rdd2022_d40_pothole_model/high_accuracy_run/weights/best.pt")

if __name__ == '__main__':
    train_custom_d40_model()
