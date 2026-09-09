import os
import io
import sys
import random
import zipfile
import xml.etree.ElementTree as ET

# Configuration
MAIN_ZIP_PATH = r'C:\Users\Manali\Downloads\RDD2022_released_through_CRDDC2022.zip'
OUTPUT_DIR = r'c:\Users\Manali\OneDrive\Desktop\New folder (4)\pothole_yolo_dataset'
TARGET_CLASS = 'D40' # Potholes class tag in RDD2022

# Seed for reproducible train/val/test split
random.seed(42)

def setup_directories(base_path):
    dirs = [
        os.path.join(base_path, 'images', 'train'),
        os.path.join(base_path, 'images', 'val'),
        os.path.join(base_path, 'images', 'test'),
        os.path.join(base_path, 'labels', 'train'),
        os.path.join(base_path, 'labels', 'val'),
        os.path.join(base_path, 'labels', 'test'),
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
    return base_path

def convert_voc_to_yolo(size, box):
    dw = 1.0 / size[0]
    dh = 1.0 / size[1]
    xmin, ymin, xmax, ymax = box
    
    # Clip coordinates to image boundaries
    xmin = max(0, min(xmin, size[0]))
    xmax = max(0, min(xmax, size[0]))
    ymin = max(0, min(ymin, size[1]))
    ymax = max(0, min(ymax, size[1]))
    
    w = xmax - xmin
    h = ymax - ymin
    if w <= 0 or h <= 0:
        return None
        
    x_center = xmin + w / 2.0
    y_center = ymin + h / 2.0
    
    return (x_center * dw, y_center * dh, w * dw, h * dh)

def process_rdd2022():
    print(f"=== RDD2022 Pothole (D40) YOLO Dataset Creator ===")
    print(f"Reading main archive: {MAIN_ZIP_PATH}")
    
    setup_directories(OUTPUT_DIR)
    
    if not os.path.exists(MAIN_ZIP_PATH):
        print(f"Error: {MAIN_ZIP_PATH} does not exist.")
        return

    # First pass: collect metadata records
    records = []
    
    with zipfile.ZipFile(MAIN_ZIP_PATH, 'r') as z_main:
        sub_zips = [f for f in z_main.namelist() if f.endswith('.zip')]
        print(f"Found {len(sub_zips)} country sub-zips: {sub_zips}")
        
        for sub_name in sub_zips:
            country = os.path.basename(sub_name).replace('.zip', '')
            print(f"\nScanning country annotations: {country}...")
            
            try:
                with z_main.open(sub_name) as sub_file:
                    with zipfile.ZipFile(sub_file) as z_sub:
                        all_files = z_sub.namelist()
                        xml_files = [f for f in all_files if f.endswith('.xml')]
                        print(f"  Total XML annotations in {country}: {len(xml_files)}")
                        
                        country_d40_count = 0
                        for xml_path in xml_files:
                            try:
                                xml_data = z_sub.read(xml_path).decode('utf-8', errors='ignore')
                                root = ET.fromstring(xml_data)
                                
                                size = root.find('size')
                                if size is None:
                                    continue
                                width = float(size.find('width').text)
                                height = float(size.find('height').text)
                                if width <= 0 or height <= 0:
                                    continue
                                    
                                d40_boxes = []
                                for obj in root.findall('object'):
                                    name_el = obj.find('name')
                                    if name_el is not None and name_el.text == TARGET_CLASS:
                                        bndbox = obj.find('bndbox')
                                        if bndbox is not None:
                                            xmin = float(bndbox.find('xmin').text)
                                            ymin = float(bndbox.find('ymin').text)
                                            xmax = float(bndbox.find('xmax').text)
                                            ymax = float(bndbox.find('ymax').text)
                                            
                                            yolo_box = convert_voc_to_yolo((width, height), (xmin, ymin, xmax, ymax))
                                            if yolo_box:
                                                d40_boxes.append(yolo_box)
                                                
                                if len(d40_boxes) > 0:
                                    base_xml = os.path.basename(xml_path).replace('.xml', '')
                                    img_path = None
                                    for ext in ['.jpg', '.png', '.jpeg', '.JPG']:
                                        matches = [f for f in all_files if f.endswith(f"{base_xml}{ext}")]
                                        if matches:
                                            img_path = matches[0]
                                            break
                                            
                                    if img_path:
                                        records.append({
                                            'sub_name': sub_name,
                                            'country': country,
                                            'xml_path': xml_path,
                                            'img_path': img_path,
                                            'img_name': os.path.basename(img_path),
                                            'boxes': d40_boxes
                                        })
                                        country_d40_count += 1
                            except Exception:
                                continue
                        print(f"  -> Identified {country_d40_count} D40 pothole images in {country}")
            except Exception as err:
                print(f"  Warning: Skipping archive {country} due to: {err}")

    total_images = len(records)
    total_annotations = sum(len(r['boxes']) for r in records)
    print(f"\n==========================================")
    print(f"Total D40 Pothole Images Identified: {total_images}")
    print(f"Total D40 Bounding Box Annotations: {total_annotations}")
    print(f"==========================================")

    if total_images == 0:
        print("No D40 pothole images found!")
        return

    # Shuffle for train (70%), val (20%), test (10%)
    random.shuffle(records)
    
    train_end = int(total_images * 0.70)
    val_end = train_end + int(total_images * 0.20)
    
    for i, rec in enumerate(records):
        if i < train_end:
            rec['split'] = 'train'
        elif i < val_end:
            rec['split'] = 'val'
        else:
            rec['split'] = 'test'

    # Group by country sub-zip to stream extraction efficiently
    grouped = {}
    for r in records:
        sub_name = r['sub_name']
        grouped.setdefault(sub_name, []).append(r)

    summary_stats = {
        'train': {'images': 0, 'annotations': 0},
        'val': {'images': 0, 'annotations': 0},
        'test': {'images': 0, 'annotations': 0},
    }

    print("\nExtracting images and writing YOLO label files to disk...")
    
    with zipfile.ZipFile(MAIN_ZIP_PATH, 'r') as z_main:
        for sub_name, rec_list in grouped.items():
            country = os.path.basename(sub_name).replace('.zip', '')
            print(f"  Extracting {len(rec_list)} files for {country}...")
            
            try:
                with z_main.open(sub_name) as sub_file:
                    with zipfile.ZipFile(sub_file) as z_sub:
                        for idx, rec in enumerate(rec_list):
                            split_name = rec['split']
                            safe_filename = f"{country}_{idx:05d}_{rec['img_name']}"
                            base_filename = os.path.splitext(safe_filename)[0]
                            
                            # Read image stream directly and save to disk
                            img_out_path = os.path.join(OUTPUT_DIR, 'images', split_name, safe_filename)
                            with z_sub.open(rec['img_path']) as f_in, open(img_out_path, 'wb') as f_out:
                                f_out.write(f_in.read())
                                
                            # Write YOLO Label (.txt) - Class 0 = pothole
                            lbl_out_path = os.path.join(OUTPUT_DIR, 'labels', split_name, f"{base_filename}.txt")
                            with open(lbl_out_path, 'w') as f_lbl:
                                for box in rec['boxes']:
                                    f_lbl.write(f"0 {box[0]:.6f} {box[1]:.6f} {box[2]:.6f} {box[3]:.6f}\n")
                                    summary_stats[split_name]['annotations'] += 1
                                    
                            summary_stats[split_name]['images'] += 1
            except Exception as ex:
                print(f"  Error extracting files for {country}: {ex}")

    # Write data.yaml
    yaml_content = f"""# RDD2022 Pothole-Only YOLO Dataset (Class 0: pothole)
path: {OUTPUT_DIR.replace('\\\\', '/')}
train: images/train
val: images/val
test: images/test

nc: 1
names:
  0: pothole
"""
    yaml_path = os.path.join(OUTPUT_DIR, 'data.yaml')
    with open(yaml_path, 'w') as f:
        f.write(yaml_content)

    print("\n" + "="*55)
    print("      RDD2022 POTHOLE (D40) DATASET SUMMARY TABLE")
    print("="*55)
    print(f"{'Split':<12} | {'Images':<12} | {'Pothole Annotations (D40)':<25}")
    print("-" * 55)
    for split_name, stats in summary_stats.items():
        print(f"{split_name.capitalize():<12} | {stats['images']:<12} | {stats['annotations']:<25}")
    print("-" * 55)
    print(f"{'TOTAL':<12} | {total_images:<12} | {total_annotations:<25}")
    print("="*55)
    print(f"\nProcessed dataset saved in: {OUTPUT_DIR}")
    print(f"YOLO Configuration file: {yaml_path}")

    # Generate standalone High-Accuracy YOLO Training script
    train_script_content = f"""# High-Accuracy RDD2022 Custom D40 Pothole Model Training Script
# Optimized for maximum recall & mAP50 to prevent missed potholes

from ultralytics import YOLO

def train_custom_d40_model():
    # Load pretrained YOLOv8/YOLOv11 model (yolov8m.pt or yolov8x.pt recommended for top accuracy)
    model = YOLO('yolov8m.pt')

    print("=== Training RDD2022 Custom D40 High-Accuracy Pothole Model ===")
    results = model.train(
        data=r'{yaml_path}',
        epochs=100,               # 100 epochs for convergence
        imgsz=640,                # High resolution input for small potholes
        batch=16,
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
"""
    train_script_path = os.path.join(OUTPUT_DIR, 'train_model.py')
    with open(train_script_path, 'w') as f_tr:
        f_tr.write(train_script_content)

    print(f"\nGenerated High-Accuracy Training Script: {train_script_path}")

if __name__ == '__main__':
    process_rdd2022()

