# Generated security migration for Athens EHS System

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),  # Replace with your latest migration
    ]

    operations = [
        # Add indexes for CustomUser model
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_customuser_username_idx ON authentication_customuser(username);",
            reverse_sql="DROP INDEX IF EXISTS auth_customuser_username_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_customuser_email_idx ON authentication_customuser(email);",
            reverse_sql="DROP INDEX IF EXISTS auth_customuser_email_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_customuser_type_admin_idx ON authentication_customuser(user_type, admin_type);",
            reverse_sql="DROP INDEX IF EXISTS auth_customuser_type_admin_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_customuser_project_idx ON authentication_customuser(project_id);",
            reverse_sql="DROP INDEX IF EXISTS auth_customuser_project_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_customuser_created_by_idx ON authentication_customuser(created_by_id);",
            reverse_sql="DROP INDEX IF EXISTS auth_customuser_created_by_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_customuser_active_idx ON authentication_customuser(is_active);",
            reverse_sql="DROP INDEX IF EXISTS auth_customuser_active_idx;"
        ),
        
        # Add indexes for UserDetail model
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_userdetail_user_idx ON authentication_userdetail(user_id);",
            reverse_sql="DROP INDEX IF EXISTS auth_userdetail_user_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_userdetail_employee_idx ON authentication_userdetail(employee_id);",
            reverse_sql="DROP INDEX IF EXISTS auth_userdetail_employee_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_userdetail_approved_idx ON authentication_userdetail(is_approved);",
            reverse_sql="DROP INDEX IF EXISTS auth_userdetail_approved_idx;"
        ),
        
        # Add indexes for CompanyDetail model
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_companydetail_user_idx ON authentication_companydetail(user_id);",
            reverse_sql="DROP INDEX IF EXISTS auth_companydetail_user_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_companydetail_name_idx ON authentication_companydetail(company_name);",
            reverse_sql="DROP INDEX IF EXISTS auth_companydetail_name_idx;"
        ),
        
        # Add indexes for AdminDetail model
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_admindetail_user_idx ON authentication_admindetail(user_id);",
            reverse_sql="DROP INDEX IF EXISTS auth_admindetail_user_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS auth_admindetail_approved_idx ON authentication_admindetail(is_approved);",
            reverse_sql="DROP INDEX IF EXISTS auth_admindetail_approved_idx;"
        ),
    ]