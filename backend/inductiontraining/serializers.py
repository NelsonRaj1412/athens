from rest_framework import serializers
from .models import InductionTraining, InductionAttendance

class InductionAttendanceSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = InductionAttendance
        fields = [
            'id', 'worker_id', 'worker_name', 'worker_photo', 'attendance_photo',
            'participant_type', 'match_score', 'status', 'created_at', 'timestamp'
        ]
        read_only_fields = ['created_at', 'timestamp']

class InductionTrainingSerializer(serializers.ModelSerializer):
    attendances = InductionAttendanceSerializer(many=True, read_only=True)
    is_signatures_complete = serializers.ReadOnlyField()
    
    class Meta:
        model = InductionTraining
        fields = [
            'id', 'title', 'description', 'date', 'start_time', 'end_time', 
            'duration', 'duration_unit', 'location', 'conducted_by', 'status', 
            'evidence_photo', 'document_id', 'revision_number',
            'trainer_signature', 'hr_signature', 'hr_name', 'hr_date',
            'safety_signature', 'safety_name', 'safety_date',
            'dept_head_signature', 'dept_head_name', 'dept_head_date',
            'created_by', 'created_at', 'updated_at', 'attendances', 'is_signatures_complete'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'document_id', 'is_signatures_complete']
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Ensure all fields including duration are properly updated
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
    
    def to_representation(self, instance):
        """Ensure duration fields are always included in response"""
        representation = super().to_representation(instance)
        
        # Ensure duration is always included
        if 'duration' not in representation or representation['duration'] is None:
            representation['duration'] = instance.duration or 60
        
        # Ensure duration_unit is always included
        if 'duration_unit' not in representation or representation['duration_unit'] is None:
            representation['duration_unit'] = instance.duration_unit or 'minutes'
        
        # Convert signature paths to full URLs
        request = self.context.get('request')
        if request:
            for field in ['trainer_signature', 'hr_signature', 'safety_signature', 'dept_head_signature']:
                if representation.get(field):
                    # If it's already a full URL, keep it as is
                    if representation[field].startswith('http'):
                        continue
                    # If it's a relative path, build full URL
                    elif representation[field].startswith('/'):
                        representation[field] = request.build_absolute_uri(representation[field])
                    else:
                        # If it's just a filename, assume it's in media
                        representation[field] = request.build_absolute_uri(f'/media/{representation[field]}')
        
        # Add signature status summary
        representation['signature_summary'] = {
            'trainer': bool(instance.trainer_signature),
            'hr': bool(instance.hr_signature),
            'safety': bool(instance.safety_signature),
            'dept_head': bool(instance.dept_head_signature),
            'complete': instance.is_signatures_complete
        }
            
        return representation

class InductionTrainingListSerializer(serializers.ModelSerializer):
    is_signatures_complete = serializers.ReadOnlyField()
    
    class Meta:
        model = InductionTraining
        fields = [
            'id', 'title', 'description', 'date', 'start_time', 'end_time',
            'duration', 'duration_unit', 'location', 'conducted_by', 'status', 
            'evidence_photo', 'document_id', 'revision_number', 'created_at', 
            'updated_at', 'is_signatures_complete',
            # Add signature fields for print preview
            'trainer_signature', 'hr_signature', 'hr_name', 'hr_date',
            'safety_signature', 'safety_name', 'safety_date',
            'dept_head_signature', 'dept_head_name', 'dept_head_date'
        ]
    
    def to_representation(self, instance):
        """Convert signature paths to full URLs for print preview"""
        representation = super().to_representation(instance)
        
        # Convert signature paths to full URLs
        request = self.context.get('request')
        if request:
            for field in ['trainer_signature', 'hr_signature', 'safety_signature', 'dept_head_signature']:
                if representation.get(field):
                    # If it's already a full URL, keep it as is
                    if representation[field].startswith('http'):
                        continue
                    # If it's a relative path, build full URL
                    elif representation[field].startswith('/'):
                        representation[field] = request.build_absolute_uri(representation[field])
                    else:
                        # If it's just a filename, assume it's in media
                        representation[field] = request.build_absolute_uri(f'/media/{representation[field]}')
        
        return representation