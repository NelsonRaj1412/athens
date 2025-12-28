from django.conf import settings

class DatabaseRouter:
    """
    Route specific models to different databases
    """
    
    # Models that should use PostgreSQL
    postgres_models = {
        'incidentmanagement',  # Large data, complex queries
        'manpower',           # Analytics, reporting
        'safetyobservation',  # Historical data
    }
    
    def db_for_read(self, model, **hints):
        """Suggest database to read from"""
        if model._meta.app_label in self.postgres_models:
            return 'postgres' if 'postgres' in settings.DATABASES else 'default'
        return 'default'
    
    def db_for_write(self, model, **hints):
        """Suggest database to write to"""
        if model._meta.app_label in self.postgres_models:
            return 'postgres' if 'postgres' in settings.DATABASES else 'default'
        return 'default'
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that certain apps' models get created on the right database"""
        if app_label in self.postgres_models:
            return db == 'postgres'
        elif db == 'postgres':
            return False
        return db == 'default'