from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import JobTraining, JobTrainingAttendance
from .utils import safe_json_dumps

User = get_user_model()

class JobTrainingAttendanceSerializer(serializers.ModelSerializer):
    worker_name = serializers.SerializerMethodField()
    worker_photo = serializers.SerializerMethodField()
    participant_name = serializers.SerializerMethodField()
    participant_photo = serializers.SerializerMethodField()
    
    class Meta:
        model = JobTrainingAttendance
        fields = [
            'id', 'job_training', 'worker', 'worker_name', 'worker_photo',
            'participant_type', 'user_id', 'user_name', 'participant_name', 'participant_photo',
            'status', 'attendance_photo', 'match_score', 'timestamp'
        ]
    
    def get_worker_name(self, obj):
        if obj.participant_type == 'worker' and obj.worker:
            return f"{obj.worker.name} {obj.worker.surname or ''}"
        elif obj.participant_type == 'user':
            return obj.user_name or 'Unknown User'
        return 'Unknown'
    
    def get_worker_photo(self, obj):
        if obj.participant_type == 'worker' and obj.worker:
            return obj.worker.photo if obj.worker.photo else None
        return None
    
    def get_participant_name(self, obj):
        if obj.participant_type == 'worker' and obj.worker:
            return f"{obj.worker.name} {obj.worker.surname or ''}"
        elif obj.participant_type == 'user':
            return obj.user_name or 'Unknown User'
        return 'Unknown'
    
    def get_participant_photo(self, obj):
        if obj.participant_type == 'worker' and obj.worker and obj.worker.photo:
            return obj.worker.photo
        # For users, we'll need to get the photo from the user model if available
        elif obj.participant_type == 'user' and obj.user_id:
            try:
                user = User.objects.get(id=obj.user_id)
                if hasattr(user, 'user_detail') and user.user_detail and user.user_detail.photo:
                    return user.user_detail.photo.url
            except:
                pass
        return None

class JobTrainingSerializer(serializers.ModelSerializer):
    attendances = JobTrainingAttendanceSerializer(many=True, read_only=True)
    
    class Meta:
        model = JobTraining
        fields = [
            'id', 'title', 'description', 'date', 'location', 
            'conducted_by', 'status', 'created_by', 'created_at', 
            'updated_at', 'attendances'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True, 'allow_null': True},
            'location': {'required': False, 'allow_blank': True, 'allow_null': True},
        }
    
    def to_representation(self, instance):
        """
        Override to handle binary data in the representation
        """
        ret = super().to_representation(instance)
        # Handle any binary data in text fields
        for field in ['title', 'description', 'location', 'conducted_by']:
            if field in ret and isinstance(ret[field], bytes):
                try:
                    ret[field] = ret[field].decode('utf-8')
                except UnicodeDecodeError:
                    ret[field] = ret[field].decode('latin-1')
        return ret
    
    def to_internal_value(self, data):
        """
        Handle potential encoding issues in incoming data
        """
        # Create a copy of the data to avoid modifying the original
        cleaned_data = {}
        
        # Handle text fields that might contain binary data
        for key, value in data.items():
            if isinstance(value, bytes):
                try:
                    cleaned_data[key] = value.decode('utf-8')
                except UnicodeDecodeError:
                    cleaned_data[key] = value.decode('latin-1')
            elif value == '':
                # Replace empty strings with None
                cleaned_data[key] = None
            else:
                cleaned_data[key] = value
        
        return super().to_internal_value(cleaned_data)

class JobTrainingListSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = JobTraining
        fields = [
            'id', 'title', 'description', 'date', 'location', 
            'conducted_by', 'status', 'created_by', 'created_by_username',
            'created_at', 'updated_at'
        ]

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'surname']
