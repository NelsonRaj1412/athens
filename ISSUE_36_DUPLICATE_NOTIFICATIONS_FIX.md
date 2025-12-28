# Issue #36: Duplicate Notifications Fix

## Problem Description
When a user completes their profile and submits it for approval, two notifications were generated for the same user action:
- "User Details Submitted" (from backend)
- "User Details Submitted" (from frontend)

Similarly, admin detail submissions were also generating duplicate notifications:
- "Admin Details Submitted" (from backend)
- "Admin Details Submitted" (from frontend)

## Root Cause Analysis
The issue was caused by **dual notification logic** where both backend and frontend were independently sending notifications for the same user action:

### User Detail Submissions
1. **Backend notification** (authentication/views.py line ~70):
   ```python
   send_websocket_notification(
       user_id=self.request.user.created_by.id,
       title="User Details Submitted",
       message=f"{self.request.user.username} has submitted their user details for approval.",
       notification_type="user_detail_submission",
       ...
   )
   ```

2. **Frontend notification** (userdetail.tsx line ~295):
   ```typescript
   await sendNotification(String(createdById), { 
       title: 'User Details Submitted', 
       message: `${values.name || 'A user'} submitted details for approval.`,
       ...
   });
   ```

### Admin Detail Submissions
1. **Backend notification** (authentication/views.py line ~1450):
   ```python
   send_websocket_notification(
       user_id=master_admin.id,
       title="Admin Details Submitted",
       message=f"{user.username} ({user.admin_type}) has submitted their admin details for approval.",
       ...
   )
   ```

2. **Frontend notification** (AdminDetail.tsx line ~395):
   ```typescript
   await sendNotification('5', {
       title: 'Admin Details Submitted',
       message: `${values.name || 'An admin'} submitted details for approval.`,
       ...
   });
   ```

## Solution Implemented
Removed the **duplicate frontend notifications** while keeping the backend notifications as the single source of truth:

### Files Modified

#### 1. `/var/www/athens/frontend/src/features/user/components/userdetail.tsx`
**Before:**
```typescript
} else {
  const createdById = response.data.created_by;
  if (createdById) {
    await sendNotification(String(createdById), { title: 'User Details Submitted', message: `${values.name || 'A user'} submitted details for approval.`, type: 'approval' as NotificationType, data: { userId: response.data.user, formType: 'userdetail' }, link: `/dashboard/profile` });
  }
  message.success('Details submitted successfully for admin approval.');
  setFormSubmitted(true);
}
```

**After:**
```typescript
} else {
  message.success('Details submitted successfully for admin approval.');
  setFormSubmitted(true);
}
```

#### 2. `/var/www/athens/frontend/src/features/admin/components/AdminDetail.tsx`
**Before:**
```typescript
// Send notification to master admin only for initial submission
if (currentUserId && !isApproved && !formSubmitted) {
  try {
    // Send notification to user ID 5 (the master admin)
    await sendNotification('5', {
      title: 'Admin Details Submitted',
      message: `${values.name || 'An admin'} submitted details for approval.`,
      type: 'approval' as NotificationType,
      data: { 
        userId: currentUserId, 
        user_id: currentUserId,
        formType: 'admindetail',
        username: authUsername,
        admin_type: userType
      },
      link: `/dashboard/admindetail`
    });
    console.log('Notification sent to master admin');
  } catch (notificationError) {
    console.error('Failed to send notification:', notificationError);
    // Don't fail the form submission if notification fails
  }
}

message.success('Details submitted successfully for master admin approval.');
setFormSubmitted(true);
setHasDetails(true);
```

**After:**
```typescript
// Details submitted successfully - backend handles notification
message.success('Details submitted successfully for master admin approval.');
setFormSubmitted(true);
setHasDetails(true);
```

## Backend Notification Logic (Preserved)
The backend notifications remain intact and serve as the single source of truth:

### User Detail Notifications
- **Trigger**: When `UserDetailRetrieveUpdateView.perform_update()` is called
- **Condition**: `has_submitted_details and not user_detail.is_approved and self.request.user.created_by and not getattr(user_detail, 'notification_sent', False)`
- **Recipient**: `self.request.user.created_by.id` (the admin who created the user)
- **Deduplication**: Uses `notification_sent` flag to prevent multiple notifications

### Admin Detail Notifications
- **Trigger**: When `AdminDetailUpdateView.put()` is called
- **Condition**: `has_submitted_details and not admin_detail.is_approved and not getattr(admin_detail, 'notification_sent', False)`
- **Recipient**: Master admin (found via `CustomUser.objects.filter(admin_type='master').first()`)
- **Deduplication**: Uses `notification_sent` flag to prevent multiple notifications

## Benefits of This Solution

1. **Single Source of Truth**: Backend handles all notification logic consistently
2. **Better Security**: Server-side validation ensures notifications are only sent when appropriate
3. **Deduplication**: Backend includes `notification_sent` flags to prevent multiple notifications
4. **Consistency**: All approval workflows now follow the same notification pattern
5. **Maintainability**: Centralized notification logic is easier to maintain and debug

## Testing Verification

### Test Case 1: User Detail Submission
1. Login as an admin user (created by project admin)
2. Fill out user details form completely
3. Submit the form
4. Verify only **one** notification is sent to the project admin
5. Verify notification contains correct title: "User Details Submitted"

### Test Case 2: Admin Detail Submission
1. Login as a project admin (client/epc/contractor)
2. Fill out admin details form completely
3. Submit the form
4. Verify only **one** notification is sent to master admin
5. Verify notification contains correct title: "Admin Details Submitted"

### Test Case 3: Resubmission Prevention
1. Submit details once
2. Try to edit and resubmit
3. Verify no additional notifications are sent (due to `notification_sent` flag)

## Related Files
- `/var/www/athens/backend/authentication/views.py` - Backend notification logic
- `/var/www/athens/backend/authentication/notification_utils.py` - Notification utilities
- `/var/www/athens/frontend/src/features/user/components/userdetail.tsx` - User detail form
- `/var/www/athens/frontend/src/features/admin/components/AdminDetail.tsx` - Admin detail form

## Status
✅ **FIXED** - Duplicate notifications eliminated, single notification per submission ensured.