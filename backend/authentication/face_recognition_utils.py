"""
Enhanced face recognition utilities for improved accuracy and consistency
"""

import cv2
import numpy as np
from PIL import Image
from io import BytesIO
import logging
import os

logger = logging.getLogger(__name__)

try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False

def calibrate_face_recognition_thresholds(reference_image_path, test_images_dir=None):
    """
    Calibrate face recognition thresholds by testing multiple images of the same person
    Returns recommended thresholds based on consistency analysis
    """
    if not FACE_RECOGNITION_AVAILABLE:
        return {"error": "face_recognition library not available"}
    
    try:
        # Load reference image
        reference_image = face_recognition.load_image_file(reference_image_path)
        reference_encodings = face_recognition.face_encodings(reference_image)
        
        if len(reference_encodings) == 0:
            return {"error": "No face detected in reference image"}
        
        reference_encoding = reference_encodings[0]
        
        # If test directory provided, analyze multiple images
        if test_images_dir and os.path.exists(test_images_dir):
            distances = []
            confidences = []
            
            for filename in os.listdir(test_images_dir):
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    test_path = os.path.join(test_images_dir, filename)
                    try:
                        test_image = face_recognition.load_image_file(test_path)
                        test_encodings = face_recognition.face_encodings(test_image)
                        
                        if len(test_encodings) > 0:
                            distance = face_recognition.face_distance([reference_encoding], test_encodings[0])[0]
                            confidence = max(0.0, 1.0 - distance)
                            distances.append(distance)
                            confidences.append(confidence)
                    except Exception as e:
                        logger.warning(f"Failed to process {filename}: {e}")
            
            if distances:
                avg_distance = np.mean(distances)
                std_distance = np.std(distances)
                avg_confidence = np.mean(confidences)
                std_confidence = np.std(confidences)
                
                # Recommend thresholds based on statistics
                recommended_confidence = max(0.6, avg_confidence - (2 * std_confidence))
                recommended_distance = min(0.5, avg_distance + (2 * std_distance))
                
                return {
                    "status": "success",
                    "analysis": {
                        "images_processed": len(distances),
                        "avg_confidence": avg_confidence,
                        "std_confidence": std_confidence,
                        "avg_distance": avg_distance,
                        "std_distance": std_distance
                    },
                    "recommendations": {
                        "confidence_threshold": recommended_confidence,
                        "distance_threshold": recommended_distance,
                        "consistency_score": 1.0 - (std_confidence / avg_confidence) if avg_confidence > 0 else 0.0
                    }
                }
        
        return {"status": "success", "message": "Reference image processed successfully"}
        
    except Exception as e:
        return {"error": f"Calibration failed: {str(e)}"}

def enhanced_face_comparison(known_image_path, unknown_image_data, custom_thresholds=None):
    """
    Enhanced face comparison with adaptive thresholds and multiple validation methods
    """
    if not FACE_RECOGNITION_AVAILABLE:
        return {"matched": False, "confidence": 0.0, "error": "face_recognition not available"}
    
    # Default thresholds (can be customized based on calibration)
    thresholds = {
        "high_confidence": 0.75,
        "medium_confidence": 0.65,
        "low_confidence": 0.60,
        "strict_distance": 0.4,
        "tolerance": 0.5
    }
    
    if custom_thresholds:
        thresholds.update(custom_thresholds)
    
    try:
        # Load known image
        known_image = face_recognition.load_image_file(known_image_path)
        
        # Process unknown image
        if isinstance(unknown_image_data, str):
            # File path
            unknown_image = face_recognition.load_image_file(unknown_image_data)
        else:
            # Bytes data
            if hasattr(unknown_image_data, 'read'):
                image_data = unknown_image_data.read()
                unknown_image_data.seek(0)
            else:
                image_data = unknown_image_data
            
            unknown_pil = Image.open(BytesIO(image_data))
            unknown_image = np.array(unknown_pil)
        
        # Get face encodings
        known_encodings = face_recognition.face_encodings(known_image)
        unknown_encodings = face_recognition.face_encodings(unknown_image)
        
        if len(known_encodings) == 0:
            return {"matched": False, "confidence": 0.0, "error": "No face in reference image"}
        
        if len(unknown_encodings) == 0:
            return {"matched": False, "confidence": 0.0, "error": "No face in captured image"}
        
        # Find best match among all detected faces
        best_confidence = 0.0
        best_distance = float('inf')
        
        for k_enc in known_encodings:
            for u_enc in unknown_encodings:
                distance = face_recognition.face_distance([k_enc], u_enc)[0]
                confidence = max(0.0, 1.0 - distance)
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_distance = distance
        
        # Multiple validation criteria
        tolerance_match = face_recognition.compare_faces(
            [known_encodings[0]], unknown_encodings[0], 
            tolerance=thresholds["tolerance"]
        )[0]
        
        strict_distance_match = best_distance < thresholds["strict_distance"]
        
        # Multi-criteria decision
        validation_results = {
            "high_confidence": best_confidence >= thresholds["high_confidence"],
            "medium_confidence_with_tolerance": (
                best_confidence >= thresholds["medium_confidence"] and tolerance_match
            ),
            "low_confidence_with_strict": (
                best_confidence >= thresholds["low_confidence"] and strict_distance_match
            )
        }
        
        final_match = any(validation_results.values())
        
        return {
            "matched": final_match,
            "confidence": best_confidence,
            "distance": best_distance,
            "validation_results": validation_results,
            "face_counts": {
                "known": len(known_encodings),
                "unknown": len(unknown_encodings)
            },
            "thresholds_used": thresholds
        }
        
    except Exception as e:
        return {"matched": False, "confidence": 0.0, "error": f"Comparison failed: {str(e)}"}

def test_face_recognition_consistency(image_path, num_tests=5):
    """
    Test face recognition consistency by running multiple comparisons on the same image
    """
    if not FACE_RECOGNITION_AVAILABLE:
        return {"error": "face_recognition library not available"}
    
    results = []
    
    for i in range(num_tests):
        try:
            # Simulate slight variations by adding minimal noise
            image = face_recognition.load_image_file(image_path)
            
            # Add minimal random noise to simulate real-world variations
            noise = np.random.normal(0, 1, image.shape).astype(np.uint8)
            noisy_image = np.clip(image.astype(int) + noise, 0, 255).astype(np.uint8)
            
            # Convert back to bytes for comparison
            pil_image = Image.fromarray(noisy_image)
            img_bytes = BytesIO()
            pil_image.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            
            # Compare with original
            result = enhanced_face_comparison(image_path, img_bytes)
            results.append(result)
            
        except Exception as e:
            logger.error(f"Consistency test {i+1} failed: {e}")
    
    if results:
        confidences = [r.get('confidence', 0) for r in results if 'confidence' in r]
        matches = [r.get('matched', False) for r in results if 'matched' in r]
        
        consistency_score = np.std(confidences) if confidences else 1.0
        match_rate = sum(matches) / len(matches) if matches else 0.0
        
        return {
            "status": "success",
            "tests_run": len(results),
            "match_rate": match_rate,
            "avg_confidence": np.mean(confidences) if confidences else 0.0,
            "confidence_std": consistency_score,
            "consistency_rating": "High" if consistency_score < 0.05 else "Medium" if consistency_score < 0.1 else "Low",
            "individual_results": results
        }
    
    return {"error": "No successful tests completed"}

def get_face_quality_metrics(image_path_or_data):
    """
    Analyze face image quality to predict recognition accuracy
    """
    try:
        # Load image
        if isinstance(image_path_or_data, str):
            image = cv2.imread(image_path_or_data)
        else:
            if hasattr(image_path_or_data, 'read'):
                image_data = image_path_or_data.read()
                image_path_or_data.seek(0)
            else:
                image_data = image_path_or_data
            
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return {"error": "Could not load image"}
        
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Quality metrics
        metrics = {}
        
        # 1. Sharpness (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        metrics['sharpness'] = laplacian_var
        metrics['sharpness_rating'] = "Good" if laplacian_var > 100 else "Fair" if laplacian_var > 50 else "Poor"
        
        # 2. Brightness
        brightness = np.mean(gray)
        metrics['brightness'] = brightness
        metrics['brightness_rating'] = "Good" if 80 <= brightness <= 180 else "Fair" if 50 <= brightness <= 220 else "Poor"
        
        # 3. Contrast
        contrast = gray.std()
        metrics['contrast'] = contrast
        metrics['contrast_rating'] = "Good" if contrast > 50 else "Fair" if contrast > 30 else "Poor"
        
        # 4. Face detection confidence
        if FACE_RECOGNITION_AVAILABLE:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_image)
            metrics['faces_detected'] = len(face_locations)
            
            if face_locations:
                # Face size relative to image
                face_area = (face_locations[0][2] - face_locations[0][0]) * (face_locations[0][1] - face_locations[0][3])
                image_area = image.shape[0] * image.shape[1]
                face_ratio = face_area / image_area
                metrics['face_size_ratio'] = face_ratio
                metrics['face_size_rating'] = "Good" if 0.1 <= face_ratio <= 0.8 else "Fair" if 0.05 <= face_ratio <= 0.9 else "Poor"
        
        # Overall quality score
        quality_scores = []
        if metrics.get('sharpness_rating') == "Good": quality_scores.append(3)
        elif metrics.get('sharpness_rating') == "Fair": quality_scores.append(2)
        else: quality_scores.append(1)
        
        if metrics.get('brightness_rating') == "Good": quality_scores.append(3)
        elif metrics.get('brightness_rating') == "Fair": quality_scores.append(2)
        else: quality_scores.append(1)
        
        if metrics.get('contrast_rating') == "Good": quality_scores.append(3)
        elif metrics.get('contrast_rating') == "Fair": quality_scores.append(2)
        else: quality_scores.append(1)
        
        overall_score = np.mean(quality_scores) / 3.0  # Normalize to 0-1
        metrics['overall_quality_score'] = overall_score
        metrics['overall_rating'] = "Good" if overall_score > 0.8 else "Fair" if overall_score > 0.6 else "Poor"
        
        return {"status": "success", "metrics": metrics}
        
    except Exception as e:
        return {"error": f"Quality analysis failed: {str(e)}"}