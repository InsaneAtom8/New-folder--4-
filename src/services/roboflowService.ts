import { BoundingBox } from '../types/pothole';

export interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

export interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image: {
    width: number;
    height: number;
  };
}

/**
 * Sends a base64 frame image to Roboflow Hosted Inference REST API
 */
export async function detectPotholesRoboflow(
  base64ImageData: string,
  apiKey: string,
  modelId: string = 'pothole-detection-system/3'
): Promise<BoundingBox[]> {
  try {
    if (!apiKey) {
      throw new Error('No Roboflow API key configured');
    }

    // Strip base64 prefix if present
    const base64Clean = base64ImageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    // Format endpoint URL with optimal confidence threshold (20%)
    const url = `https://detect.roboflow.com/${modelId}?api_key=${apiKey}&confidence=20`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: base64Clean,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Roboflow API returned status ${response.status}: ${errText}`);
      throw new Error(`Roboflow API error: ${response.statusText}`);
    }

    const data: RoboflowResponse = await response.json();

    if (!data.predictions || data.predictions.length === 0) {
      return [];
    }

    // Convert pixels to normalized ratio 0-1
    const imgW = data.image?.width || 640;
    const imgH = data.image?.height || 480;

    return data.predictions.map(pred => ({
      x: pred.x / imgW,
      y: pred.y / imgH,
      width: pred.width / imgW,
      height: pred.height / imgH,
      confidence: Math.round(pred.confidence * 100),
      class: pred.class || 'pothole',
    }));
  } catch (error) {
    console.warn('Roboflow API call failed, using Computer Vision fallback:', error);
    throw error;
  }
}
