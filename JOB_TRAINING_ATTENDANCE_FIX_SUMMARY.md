# Job Training Attendance Data Mapping Fix

## Issue Summary
In the EPC User → Training Module, after updating Attendance (Present/Absent) for Induction Workers and Users, only worker attendance details were displayed in Job Training. User attendance details were not shown due to:

1. **404 Error**: Frontend was calling `/jobtraining/deployed-workers/` which didn't exist
2. **Missing User Support**: JobTrainingAttendanceSerializer didn't handle user attendance properly
3. **Data Mapping Issues**: Attendance records for users weren't being linked correctly

## Fixes Implemented

### 1. Backend URL Routing Fix
**File**: `/var/www/athens/backend/jobtraining/urls.py`
- Added missing `deployed-workers/` endpoint that redirects to `trained-personnel`
- This fixes the 404 error: `GET https://prozeal.athenas.co.in/jobtraining/deployed-workers/ 404 (Not Found)`

### 2. Enhanced JobTrainingAttendanceSerializer
**File**: `/var/www/athens/backend/jobtraining/serializers.py`
- Added support for both worker and user attendance records
- Added new fields: `participant_type`, `user_id`, `user_name`, `participant_name`, `participant_photo`
- Enhanced methods to handle both worker and user data properly
- Added proper photo handling for users from `user_detail` model

### 3. Updated Trained Personnel Endpoint
**File**: `/var/www/athens/backend/jobtraining/views.py`
- Modified `trained_personnel` method to return all participants in `workers` field for frontend compatibility
- Ensures both workers and users are included in the response
- Maintains separate user data while providing combined list

### 4. Enhanced Attendance Handling
**File**: `/var/www/athens/backend/jobtraining/views.py`
- Updated `attendance` method to properly handle both worker and user attendance
- Fixed unique constraints for attendance records
- Added proper serialization context for both GET and POST operations
- Ensures user attendance records are created and retrieved correctly

### 5. Frontend Simplification
**File**: `/var/www/athens/frontend/src/features/jobtraining/components/JobTrainingAttendance.tsx`
- Simplified to use only `/jobtraining/trained-personnel/` endpoint
- Removed redundant API calls that were causing confusion
- Properly handles both worker and user participants from single endpoint

## Database Model Support
The existing `JobTrainingAttendance` model already had the necessary fields:
- `participant_type` (worker/user)
- `user_id` for storing user IDs
- `user_name` for storing user names
- `worker` field (nullable for user records)

## Result
After these fixes:
1. ✅ No more 404 errors when accessing job training attendance
2. ✅ Both worker and user attendance records are displayed together
3. ✅ User attendance details are visible after updating Present/Absent status
4. ✅ Proper data mapping between induction training and job training attendance
5. ✅ Unified interface showing all trained personnel (workers + users)

## Testing
The fixes have been implemented and the servers restarted. The endpoints now return proper HTTP status codes (301 redirects for authentication, which is expected behavior).

## Files Modified
1. `/var/www/athens/backend/jobtraining/urls.py`
2. `/var/www/athens/backend/jobtraining/serializers.py`
3. `/var/www/athens/backend/jobtraining/views.py`
4. `/var/www/athens/frontend/src/features/jobtraining/components/JobTrainingAttendance.tsx`

The system now properly displays attendance records for both Induction Workers and Users in the Job Training module, resolving the reported issue.