# User Management Feature

## Overview
Added a comprehensive User Management tab for admins to manage user accounts, roles, and permissions.

## What Was Added

### 1. New Service: `src/services/usersService.js`
Service layer for managing users with the following functions:
- `subscribeToUsers()` - Real-time subscription to all users
- `updateUserRole(userId, role)` - Change user role (user/admin)
- `toggleUserStatus(userId, isActive)` - Enable/disable user accounts
- `updateUserDepartment(userId, department)` - Update user's department

### 2. New Admin Tab: "User Management"
Located in **Admin Queue → User Management**

#### Features:

**Search & Filter:**
- Search by name or email
- Filter by department
- Filter by role (All/Users/Admins)

**User Table Columns:**
- User avatar and name
- Email address
- Department
- Role (with toggle button)
- Status (Active/Disabled with toggle button)
- Join date
- Quick actions (Promote/Demote)

**User Statistics Dashboard:**
- Total Users count
- Admin count
- Regular User count
- Active users count

#### Functionality:

**Role Management:**
- Click role badge to toggle between User/Admin
- Cannot change your own role (protection)
- Visual feedback with color-coded badges:
  - Admin: Purple badge
  - User: Gray badge

**Account Status:**
- Click status badge to enable/disable accounts
- Cannot disable your own account (protection)
- Visual feedback with color-coded badges:
  - Active: Green badge
  - Disabled: Red badge

**Visual Indicators:**
- Current user row highlighted in purple
- "You" badge on current user
- Avatar with user initials
- Responsive table with horizontal scroll on mobile

#### Security Features:
- Admins cannot change their own role
- Admins cannot disable their own account
- All actions require admin privileges
- Real-time updates across all admin sessions

## How to Use

### As an Admin:

1. **Access User Management:**
   - Log in as admin
   - Go to **Admin Queue** tab
   - Click **User Management** sub-tab

2. **Search for Users:**
   - Type in search box to find by name or email
   - Use department dropdown to filter by department
   - Use role dropdown to see only admins or users

3. **Promote/Demote Users:**
   - Click the role badge (Admin/User) to toggle
   - Or click "Promote"/"Demote" button in Actions column
   - Change takes effect immediately

4. **Enable/Disable Accounts:**
   - Click the status badge (Active/Disabled) to toggle
   - Disabled users cannot log in
   - Change takes effect immediately

5. **View Statistics:**
   - See total users, admins, regular users, and active users
   - Numbers update in real-time

## Technical Details

### Database Structure

No changes to existing `users` collection schema. Added optional field:
- `isActive` (boolean) - User account status (default: true)
- `updatedAt` (timestamp) - Last update timestamp

### Security Rules

Existing Firestore rules already cover user management:
- Admins can read all users
- Admins can update any user
- Users can only update their own profile
- Only admins can delete users

### Real-time Updates

Uses Firestore `onSnapshot` to subscribe to user changes:
- All admins see updates instantly
- No page refresh needed
- Automatic synchronization across sessions

## Future Enhancements

Possible additions:
- Bulk user operations (import CSV, bulk role changes)
- User activity logs
- Last login tracking
- Email verification status
- Password reset functionality
- More granular permissions (beyond user/admin)
- User groups/teams

## Testing Checklist

### As Admin:
- [x] Can view all users in User Management tab
- [x] Can search users by name and email
- [x] Can filter users by department
- [x] Can filter users by role
- [x] Can promote user to admin
- [x] Can demote admin to user
- [x] Cannot change own role
- [x] Can enable/disable user accounts
- [x] Cannot disable own account
- [x] See real-time updates when another admin makes changes
- [x] See correct user statistics

### As Regular User:
- [ ] Cannot see User Management tab
- [ ] Cannot access admin endpoints
