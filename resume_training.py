# Resume YOLOv8 RDD2022 D40 Pothole Training
# Run this script when you're back to continue from the last saved checkpoint

from ultralytics import YOLO

print("=== Resuming RDD2022 Custom D40 Pothole Training from last checkpoint ===")
model = YOLO('runs/detect/rdd2022_d40_pothole_model/high_accuracy_run-4/weights/last.pt')
model.train(resume=True)
print("Training complete! Best weights saved at: rdd2022_d40_pothole_model/high_accuracy_run/weights/best.pt")
