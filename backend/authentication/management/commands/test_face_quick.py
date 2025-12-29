"""
Quick face recognition test command
Usage: python manage.py test_face_quick --image1 /path/to/image1.jpg --image2 /path/to/image2.jpg
"""

from django.core.management.base import BaseCommand
import os
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Quick test of face recognition between two images'

    def add_arguments(self, parser):
        parser.add_argument('--image1', type=str, required=True, help='Path to first image')
        parser.add_argument('--image2', type=str, required=True, help='Path to second image')
        parser.add_argument('--verbose', action='store_true', help='Verbose output')

    def handle(self, *args, **options):
        image1_path = options['image1']
        image2_path = options['image2']
        verbose = options['verbose']
        
        # Check if files exist
        if not os.path.exists(image1_path):
            self.stdout.write(self.style.ERROR(f'Image 1 not found: {image1_path}'))
            return
            
        if not os.path.exists(image2_path):
            self.stdout.write(self.style.ERROR(f'Image 2 not found: {image2_path}'))
            return
        
        self.stdout.write(f'Testing face recognition between:')
        self.stdout.write(f'  Image 1: {image1_path}')
        self.stdout.write(f'  Image 2: {image2_path}')
        
        try:
            # Test face_recognition library
            import face_recognition
            import numpy as np
            
            self.stdout.write('✅ face_recognition library loaded')
            
            # Load images
            self.stdout.write('Loading images...')
            image1 = face_recognition.load_image_file(image1_path)
            image2 = face_recognition.load_image_file(image2_path)
            
            self.stdout.write(f'✅ Images loaded - Image1: {image1.shape}, Image2: {image2.shape}')
            
            # Detect faces
            self.stdout.write('Detecting faces...')
            face_locations1 = face_recognition.face_locations(image1)
            face_locations2 = face_recognition.face_locations(image2)
            
            self.stdout.write(f'✅ Faces detected - Image1: {len(face_locations1)}, Image2: {len(face_locations2)}')
            
            if verbose:
                self.stdout.write(f'  Image1 face locations: {face_locations1}')
                self.stdout.write(f'  Image2 face locations: {face_locations2}')
            
            if len(face_locations1) == 0:
                self.stdout.write(self.style.WARNING('❌ No faces detected in Image 1'))
                return
                
            if len(face_locations2) == 0:
                self.stdout.write(self.style.WARNING('❌ No faces detected in Image 2'))
                return
            
            # Generate encodings
            self.stdout.write('Generating face encodings...')
            encodings1 = face_recognition.face_encodings(image1)
            encodings2 = face_recognition.face_encodings(image2)
            
            self.stdout.write(f'✅ Encodings generated - Image1: {len(encodings1)}, Image2: {len(encodings2)}')
            
            if len(encodings1) == 0 or len(encodings2) == 0:
                self.stdout.write(self.style.WARNING('❌ Failed to generate face encodings'))
                return
            
            # Compare faces
            self.stdout.write('Comparing faces...')
            
            best_confidence = 0.0
            best_distance = float('inf')
            
            for i, enc1 in enumerate(encodings1):
                for j, enc2 in enumerate(encodings2):
                    distance = face_recognition.face_distance([enc1], enc2)[0]
                    confidence = max(0.0, 1.0 - distance)
                    
                    if verbose:
                        self.stdout.write(f'  Face {i+1} vs Face {j+1}: distance={distance:.3f}, confidence={confidence:.3f}')
                    
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_distance = distance
            
            # Test different tolerance levels
            tolerance_results = {}
            for tolerance in [0.4, 0.5, 0.6, 0.7]:
                matches = face_recognition.compare_faces([encodings1[0]], encodings2[0], tolerance=tolerance)
                tolerance_results[tolerance] = matches[0]
            
            # Display results
            self.stdout.write('\n' + '='*50)
            self.stdout.write('FACE COMPARISON RESULTS')
            self.stdout.write('='*50)
            self.stdout.write(f'Best Confidence: {best_confidence:.3f} ({best_confidence*100:.1f}%)')
            self.stdout.write(f'Best Distance: {best_distance:.3f}')
            
            self.stdout.write('\nTolerance Test Results:')
            for tolerance, match in tolerance_results.items():
                status_icon = '✅' if match else '❌'
                self.stdout.write(f'  Tolerance {tolerance}: {status_icon} {match}')
            
            # Enhanced decision criteria
            conditions = [
                ('High Confidence (≥65%)', best_confidence >= 0.65),
                ('Good Confidence + Tolerance (≥55% + 0.6)', best_confidence >= 0.55 and tolerance_results.get(0.6, False)),
                ('Fair Confidence + Strict Tolerance (≥45% + 0.4)', best_confidence >= 0.45 and tolerance_results.get(0.4, False)),
                ('Single Face Bonus (≥35%)', best_confidence >= 0.35 and len(encodings1) == 1 and len(encodings2) == 1),
            ]
            
            self.stdout.write('\nDecision Criteria:')
            final_match = False
            for criteria, result in conditions:
                status_icon = '✅' if result else '❌'
                self.stdout.write(f'  {status_icon} {criteria}')
                if result:
                    final_match = True
            
            self.stdout.write('\n' + '='*50)
            if final_match:
                self.stdout.write(self.style.SUCCESS(f'🎉 FINAL RESULT: MATCH (Confidence: {best_confidence:.3f})'))
            else:
                self.stdout.write(self.style.WARNING(f'❌ FINAL RESULT: NO MATCH (Confidence: {best_confidence:.3f})'))
            self.stdout.write('='*50)
            
        except ImportError as e:
            self.stdout.write(self.style.ERROR(f'❌ face_recognition library not available: {e}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error during face recognition test: {e}'))
            if verbose:
                import traceback
                self.stdout.write(traceback.format_exc())