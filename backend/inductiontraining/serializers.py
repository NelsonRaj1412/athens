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
    
    class Meta:
        model = InductionTraining
        fields = [
            'id', 'title', 'description', 'date', 'duration', 'duration_unit',
            'location', 'conducted_by', 'status', 'evidence_photo', 'created_by', 
            'created_at', 'updated_at', 'attendances'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
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
            
        return representation

class InductionTrainingListSerializer(serializers.ModelSerializer):
    class Meta:
        model = InductionTraining
        fields = [
            'id', 'title', 'description', 'date', 'duration', 'duration_unit',
            'location', 'conducted_by', 'status', 'evidence_photo', 'created_at', 'updated_at'
        ]