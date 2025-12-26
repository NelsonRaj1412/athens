# Project-Based Data Isolation System

## Overview

The Athens EHS System implements comprehensive project-based data isolation to ensure that users can only access data and resources belonging to their assigned project. This critical security feature prevents cross-project data leakage and maintains strict data boundaries.

## Key Principles

### 1. **Complete Data Isolation**
- Users can only access data from their assigned project
- No cross-project data visibility (except for master admin)
- All database queries are automatically filtered by project

### 2. **Automatic Project Assignment**
- All created resources are automatically assigned to the creator's project
- Project assignment is enforced at the model level
- No manual project selection required

### 3. **Hierarchical Access Control**
- Master Admin: Access to all projects (system administration)
- Project Admin: Access to their assigned project only
- Admin Users: Access to their assigned project only
- Workers: Belong to a specific project

## Implementation Details

### Database Models

All major models include project relationships:

```python
# Example: Worker Model
class Worker(models.Model):
    # ... other fields ...
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='workers'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_workers'
    )
```

### ViewSet Modifications

All ViewSets implement project filtering:

```python
def get_queryset(self):
    user = self.request.user
    
    # Master admin sees all data
    if user.is_superuser or user.admin_type == 'master':
        return Model.objects.all()
    
    # PROJECT ISOLATION: Filter by user's project
    if not user.project:
        return Model.objects.none()
    
    return Model.objects.filter(project=user.project)
```

### Automatic Project Assignment

```python
def perform_create(self, serializer):
    # PROJECT ISOLATION: Ensure user has a project
    if not self.request.user.project:
        raise ValidationError("User must be assigned to a project")
    
    serializer.save(
        created_by=self.request.user,
        project=self.request.user.project
    )
```

## Security Features

### 1. **Middleware Protection**
- `ProjectIsolationMiddleware`: Validates project access for sensitive endpoints
- `SecurityAuditMiddleware`: Logs all access attempts for monitoring

### 2. **Utility Functions**
- `require_project_access`: Decorator for view-level protection
- `validate_project_access`: Function to check project access
- `filter_by_project`: Automatic queryset filtering

### 3. **Audit System**
- Management command: `audit_project_isolation`
- Identifies and fixes project boundary violations
- Regular monitoring and reporting

## Protected Resources

The following resources are protected by project isolation:

### Core Resources
- **Workers**: Only workers from the same project
- **Induction Training**: Project-specific training sessions
- **Attendance Records**: Cross-project attendance prevented
- **User Management**: Project-bounded user creation and management

### Extended Resources (when available)
- **PTW (Permit to Work)**: Project-specific permits
- **Incidents**: Project-bounded incident reporting
- **Manpower**: Project-specific workforce management
- **Toolbox Talks**: Project-bounded safety meetings
- **Inspections**: Project-specific inspection records
- **Job Training**: Project-bounded training records
- **Safety Observations**: Project-specific observations
- **MOM (Minutes of Meeting)**: Project-bounded meeting records

## User Types and Access Levels

### Master Admin
- **Access**: All projects and system-wide data
- **Capabilities**: 
  - Create and manage projects
  - Create project admins
  - System administration
  - Cross-project reporting

### Project Admin (Client/EPC/Contractor)
- **Access**: Single assigned project only
- **Capabilities**:
  - Create and manage admin users within their project
  - Access all project-specific data
  - Manage project resources

### Admin Users (Client/EPC/Contractor Users)
- **Access**: Single assigned project only
- **Capabilities**:
  - Access project-specific data based on role
  - Create and manage workers (if authorized)
  - Participate in project activities

### Workers
- **Access**: Belong to a specific project
- **Capabilities**:
  - Participate in project activities
  - Access limited to their own records

## API Endpoints and Project Filtering

### Induction Training
```
GET /api/induction/initiated-workers/
- Returns only workers and users from the same project
- Filters attendance records by project-specific inductions

POST /api/induction/{id}/attendance/
- Only allows attendance for inductions in the same project
- Validates worker/user project membership
```

### Worker Management
```
GET /api/workers/
- Returns only workers from the same project

POST /api/workers/
- Automatically assigns worker to creator's project

PUT /api/workers/{id}/
- Only allows updates to workers in the same project
```

### User Management
```
GET /api/authentication/users/
- Returns only users from the same project

POST /api/authentication/users/
- Automatically assigns user to creator's project
```

## Error Handling

### Common Error Responses

```json
{
  "error": "Access denied",
  "message": "You can only access resources from your project.",
  "code": "PROJECT_MISMATCH"
}
```

```json
{
  "error": "Project access required",
  "message": "User must be assigned to a project to access this resource.",
  "code": "PROJECT_REQUIRED"
}
```

## Monitoring and Auditing

### Audit Command
```bash
# Check for violations
python manage.py audit_project_isolation --dry-run

# Fix violations
python manage.py audit_project_isolation --fix

# Audit specific project
python manage.py audit_project_isolation --project-id 1
```

### Security Logging
All project access attempts are logged for security monitoring:

```
INFO Project Access: User john_doe (project: Construction Site A) performed access on Worker:123
WARN User jane_smith attempted to access project-isolated resource without project assignment
```

## Best Practices

### For Developers

1. **Always use project filtering in querysets**
2. **Validate project access in custom views**
3. **Use the provided utility functions and mixins**
4. **Test cross-project access scenarios**

### For System Administrators

1. **Regularly run audit commands**
2. **Monitor security logs for access violations**
3. **Ensure all users have proper project assignments**
4. **Review project boundaries during system updates**

### For Project Managers

1. **Verify user project assignments**
2. **Report any cross-project data visibility**
3. **Ensure proper user onboarding with project assignment**

## Troubleshooting

### Common Issues

1. **User has no project assigned**
   - Solution: Assign user to appropriate project
   - Command: Update user.project in admin interface

2. **Cross-project data visibility**
   - Solution: Run audit command to identify violations
   - Command: `python manage.py audit_project_isolation --fix`

3. **Worker/resource creation fails**
   - Cause: User not assigned to project
   - Solution: Ensure user has valid project assignment

### Debugging

1. **Check user project assignment**:
   ```python
   user = User.objects.get(username='username')
   print(f"User project: {user.project}")
   ```

2. **Verify queryset filtering**:
   ```python
   from authentication.project_isolation import filter_by_project
   filtered_qs = filter_by_project(Worker.objects.all(), user)
   ```

3. **Test project access**:
   ```python
   from authentication.project_isolation import validate_project_access
   has_access = validate_project_access(user, worker_object)
   ```

## Security Considerations

1. **Data Leakage Prevention**: All queries are filtered by project
2. **Access Control**: Multiple layers of validation
3. **Audit Trail**: Complete logging of access attempts
4. **Automatic Enforcement**: No manual intervention required
5. **Error Handling**: Graceful failure with informative messages

## Future Enhancements

1. **Role-based project access**: Fine-grained permissions within projects
2. **Multi-project users**: Users with access to multiple projects
3. **Project hierarchies**: Parent-child project relationships
4. **Advanced auditing**: Real-time violation detection
5. **API rate limiting**: Per-project API usage limits

---

This project isolation system ensures complete data security and prevents any cross-project data access, maintaining the integrity and confidentiality of each project's information.