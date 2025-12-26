# Mandatory Induction Training Business Rules Implementation

## Overview
This document outlines the implementation of strict business rules for mandatory induction training across the Athens EHS System.

## Business Rules Implemented

### 1. Mandatory Induction Training
- **Rule**: Every user and worker must complete induction training before accessing any modules
- **Implementation**: 
  - Backend middleware (`InductionTrainingMiddleware`) blocks API access to restricted modules
  - Frontend hook (`useInductionTrainingEnforcement`) prevents navigation to restricted pages
  - Blocked modules: Workers, Manpower, Safety Observation, Incident Management, PTW, Inspections, ESG, Quality, Job Training, Toolbox Talk, MOM

### 2. Induction Training Eligibility Logic
- **Rule**: Only show users/workers who have NOT completed induction training
- **Implementation**: 
  - `initiated_workers` endpoint filters out workers who have completed induction (present in `InductionAttendance`)
  - Only shows workers with `employment_status='initiated'` who haven't attended induction

### 3. Safety Department Exception
- **Rule**: EPC Safety Department users are exempt from induction requirements but restricted to induction training modules only
- **Implementation**:
  - Check: `user.admin_type == 'epc'` AND `user.department.lower().contains('safety')`
  - These users bypass induction training requirements
  - **Restriction**: They can ONLY access induction training modules, not other operational modules
  - Backend middleware blocks access to all other modules except induction training

### 4. Menu Visibility Control
- **Rule**: Induction Training menu only visible to EPC Safety Department users
- **Implementation**:
  - `getTrainingMenuItems()` function in `menuConfig.tsx`
  - Induction Training menu item only added if `isEPCSafetyUser()` returns true
  - All other users see Job Training and Toolbox Talk only

### 5. Access Control Enforcement
- **Rule**: Enforce at both UI and backend levels
- **Implementation**:
  - **Backend**: Middleware intercepts all API requests and blocks access
  - **Frontend**: Hook prevents navigation and shows error messages
  - **API**: Individual endpoints check permissions before processing

## Technical Implementation

### Backend Components

#### 1. Middleware (`authentication/middleware.py`)
```python
class InductionTrainingMiddleware:
    - Intercepts all requests
    - Checks user induction status
    - Blocks access to restricted APIs
    - Returns 403 with specific error message
```

#### 2. Induction Status Endpoint (`authentication/induction_views.py`)
```python
@api_view(['GET'])
def induction_status(request):
    - Checks if user completed induction
    - Returns exemption status (Master Admin, EPC Safety)
    - Used by frontend to enforce rules
```

#### 3. Updated Induction Views (`inductiontraining/views.py`)
```python
class InductionTrainingViewSet:
    - Restricted to EPC Safety Department only
    - initiated_workers endpoint filters completed workers
    - All CRUD operations require EPC Safety access
```

### Frontend Components

#### 1. Menu Configuration (`dashboard/config/menuConfig.tsx`)
```typescript
const getTrainingMenuItems = (usertype, django_user_type, department) => {
    // Only EPC Safety sees Induction Training
    if (isEPCSafetyUser(usertype, department)) {
        items.push(inductionTrainingMenuItem);
    }
}
```

#### 2. Enforcement Hook (`hooks/useInductionTrainingEnforcement.ts`)
```typescript
export const useInductionTrainingEnforcement = () => {
    - Checks induction status on route changes
    - Blocks navigation to restricted paths
    - Shows error messages
    - Redirects to dashboard if access denied
}
```

## User Type Access Matrix

| User Type | Induction Required | Can See Induction Menu | Can Conduct Training | Module Access |
|-----------|-------------------|----------------------|---------------------|---------------|
| Master Admin | ❌ (Exempt) | ❌ | ❌ | ✅ Full Access |
| EPC Safety | ❌ (Exempt) | ✅ | ✅ | ⚠️ Induction Training Only |
| EPC Admin | ✅ | ❌ | ❌ | ❌ Until Complete |
| Client Admin | ✅ | ❌ | ❌ | ❌ Until Complete |
| Contractor Admin | ✅ | ❌ | ❌ | ❌ Until Complete |
| Admin Users | ✅ | ❌ | ❌ | ❌ Until Complete |
| Workers | ✅ | ❌ | ❌ | ❌ Until Complete |

## Blocked Modules Until Induction Complete

1. **Workers Management** - `/dashboard/workers`
2. **Manpower Records** - `/dashboard/manpower`
3. **Safety Observation** - `/dashboard/safetyobservation`
4. **Incident Management** - `/dashboard/incidentmanagement`
5. **Permits to Work** - `/dashboard/ptw`
6. **Inspections** - `/dashboard/inspection`
7. **ESG Management** - `/dashboard/esg`
8. **Quality Management** - `/dashboard/quality`
9. **Job Training** - `/dashboard/jobtraining`
10. **Toolbox Talk** - `/dashboard/toolboxtalk`
11. **Minutes of Meeting** - `/dashboard/mom`

## Exempt Paths (Always Accessible)

1. **Dashboard Overview** - `/dashboard`
2. **User/Admin Details** - `/dashboard/userdetail`, `/dashboard/admindetail`
3. **Voice Translator** - `/dashboard/voice-translator`
4. **Induction Training** - `/dashboard/inductiontraining` (EPC Safety only)
5. **Authentication** - Login/logout endpoints

## Error Handling

### Backend Error Response
```json
{
    "error": "Induction training required",
    "message": "You must complete induction training before accessing this module.",
    "required_action": "complete_induction_training"
}
```

### Frontend Error Message
- Antd message notification with 5-second duration
- Automatic redirect to dashboard
- Clear instruction to complete induction training

## Deployment Notes

1. **Backend**: Middleware added to Django settings, service restarted
2. **Frontend**: Hook integration required in main app component
3. **Database**: Uses existing `InductionAttendance` model
4. **Testing**: All endpoints return 403 for non-inducted users

## Security Considerations

1. **No Bypass Routes**: All API endpoints protected by middleware
2. **Frontend + Backend**: Dual enforcement prevents circumvention
3. **Role Validation**: Strict checking of user types and departments
4. **Audit Trail**: All access attempts logged through Django logging

This implementation ensures complete compliance with the mandatory induction training business rules across the entire Athens EHS System.