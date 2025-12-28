from rest_framework import serializers
from .models import ToolboxTalk, ToolboxTalkAttendance
from django.contrib.auth import get_user_model
from worker.models import Worker
from worker.serializers import WorkerSerializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'surname']
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Use name and surname instead of first_name and last_name
        representation['name'] = f"{instance.name or ''} {instance.surname or ''}".strip() or instance.username
        return representation

class ToolboxTalkAttendanceSerializer(serializers.ModelSerializer):
    worker_name = serializers.SerializerMethodField()
    worker_photo = serializers.SerializerMethodField()
    
    class Meta:
        model = ToolboxTalkAttendance
        fields = [
            'id', 'toolbox_talk_id', 'worker_id', 'worker_name', 
            'worker_photo', 'attendance_photo', 'status', 
            'match_score', 'timestamp'
        ]
        read_only_fields = ['timestamp']
    
    def get_worker_name(self, obj):
        return f"{obj.worker.name} {obj.worker.surname or ''}".strip()
    
    def get_worker_photo(self, obj):
        if obj.worker.photo:
            return obj.worker.photo.url
        return None

class ToolboxTalkSerializer(serializers.ModelSerializer):
    attendance_records = ToolboxTalkAttendanceSerializer(many=True, read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = ToolboxTalk
        fields = [
            'id', 'title', 'description', 'date', 'duration', 'duration_unit', 
            'location', 'conducted_by', 'status', 'created_by', 
            'created_by_details', 'created_at', 'updated_at', 
            'attendance_records', 'evidence_photo'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by_details', 'created_by']
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)
        
    def update(self, instance, validated_data):
        # Ensure all fields are properly updated and persisted
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Ensure project is maintained during updates
        if not instance.project and hasattr(self.context.get('request'), 'user'):
            user = self.context['request'].user
            if user.project:
                instance.project = user.project
        
        instance.save()
        return instance
        
    def validate(self, data):
        # Make created_by optional during updates
        if self.instance and 'created_by' not in data:
            # This is an update operation, not a create
            pass  # created_by is not required for updates
        return data
    
    def to_representation(self, instance):
        """Ensure all fields are properly serialized for frontend"""
        representation = super().to_representation(instance)
        
        # Ensure duration is always included
        if 'duration' not in representation or representation['duration'] is None:
            representation['duration'] = instance.duration or 30
        
        # Ensure duration_unit is always included
        if 'duration_unit' not in representation or representation['duration_unit'] is None:
            representation['duration_unit'] = instance.duration_unit or 'minutes'
            
        return representation
