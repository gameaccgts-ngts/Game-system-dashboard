# System Maintenance & Reset Feature - Restoration

## Overview
This document describes the system maintenance and reset tracking features that were restored to ensure HIPAA compliance and proper handling of sensitive patient information on gaming systems.

## Why This Feature is Critical
Gaming systems used in hospital settings may inadvertently store patient information (e.g., patient names entered in games, saved profiles, etc.). Regular system resets are essential to:
- Remove all potentially sensitive patient data
- Maintain HIPAA compliance
- Protect patient privacy
- Ensure systems are clean before each checkout

## Features Restored

### 1. System Reset Date Tracking
**Location:** Admin Queue → System Inventory

Each gaming system now tracks a "System Reset Date" - the scheduled date when the system needs to be factory reset to remove any accumulated patient data.

**Visual Indicators:**
- **Red (Overdue)**: Reset date has passed - system should NOT be checked out until reset
- **Yellow (Soon)**: Reset due within 30 days - proactive warning
- **Normal**: Reset date is more than 30 days away

### 2. Last Maintenance Date Tracking
**Location:** Admin Queue → System Inventory

Each system tracks when it was last serviced/maintained.

**Visual Indicators:**
- **Red (Overdue)**: Not maintained in 60+ days
- **Normal**: Maintained within last 60 days

### 3. System Edit Modal Fields
**Location:** Admin Queue → System Inventory → Add/Edit System

Two new date fields added:
- **System Reset Date**: For patient data removal scheduling
  - Label includes helper text: "For patient data removal"
- **Last Maintenance**: Service/inspection date
  - Label includes helper text: "Service/inspection date"

### 4. Inventory Table Columns
**Location:** Admin Queue → System Inventory → Table

Two new columns added:
- **System Reset**: Shows reset date with status indicators
  - Displays "(Overdue!)" in red if past due
  - Displays "(Soon)" in yellow if within 30 days
  - Shows "Not set" in gray if no date entered
- **Last Maint.**: Shows last maintenance date
  - Displays "(Due)" in red if over 60 days old
  - Shows "Not set" in gray if no date entered

### 5. Maintenance Alert Cards
**Location:** Admin Queue → System Inventory → Top of page

Two alert cards appear when action is needed:

**Upcoming System Resets (Yellow Card)**
- Shows systems requiring reset within 30 days
- Lists system name and reset date
- Helps admins plan ahead for resets

**Overdue Maintenance (Red Card)**
- Shows systems not maintained in 60+ days
- Lists system name and last maintenance date
- Indicates systems needing service attention

## Technical Implementation

### Database Schema
The following fields were added to each system document in the `systems` Firestore collection:
```javascript
{
  systemReset: '2025-02-15',        // ISO date string
  lastMaintenance: '2025-01-12',    // ISO date string
  // ... other system fields
}
```

### Code Changes
**File:** `src/components/GameSystemCheckout.jsx`

1. **System Modal (lines 1386-1409)**: Added date input fields for both tracking dates
2. **Inventory Table (lines 1220-1221, 1258-1278)**: Added two new columns with color-coded status
3. **Table Logic (lines 1230-1236)**: Added date calculations for overdue/upcoming status
4. **Alert Section (lines 1223-1262)**: Added maintenance alert cards with filtering logic
5. **Alert Calculations (lines 1181-1196)**: Logic to identify systems needing attention

### Service Layer
**File:** `src/services/systemsService.js`

No changes required! The existing service automatically handles these fields because it uses the spread operator (`...systemData`) when creating and updating systems.

## How to Use

### For Admins - Setting Up Systems

1. Go to **Admin Queue** → **System Inventory**
2. Click **Add System** or edit an existing system
3. Fill in the new fields:
   - **System Reset Date**: Set the next date this system should be factory reset (e.g., quarterly)
   - **Last Maintenance**: Record when the system was last serviced
4. Click **Save Changes**

### For Admins - Monitoring Compliance

1. Go to **Admin Queue** → **System Inventory**
2. Check for alert cards at the top:
   - Yellow card = systems need reset soon
   - Red card = systems overdue for maintenance
3. Review the inventory table:
   - Red dates in "System Reset" column = URGENT - reset before checkout
   - Red dates in "Last Maint." column = Schedule maintenance soon
4. Click **Edit** on systems needing attention to update dates after servicing

### Recommended Schedule

**System Resets:**
- Schedule resets every 90 days (quarterly)
- Always reset before the date shown in red
- Reset immediately after any long-term checkout (7+ days)

**Maintenance:**
- Perform maintenance every 60 days
- Inspect controllers, cables, and console condition
- Update the "Last Maintenance" date after service

## Best Practices

1. **Set Reset Dates When Adding Systems**: Always set an initial system reset date
2. **Update After Resets**: Immediately update the system reset date to the next quarter
3. **Track Maintenance**: Use the maintenance date to track cleaning, inspection, cable checks
4. **Never Ignore Red Warnings**: Systems with overdue resets should NOT be checked out
5. **Plan Ahead**: Use the yellow warnings to schedule resets during low-demand periods

## HIPAA Compliance Notes

This feature helps maintain HIPAA compliance by:
- Ensuring regular removal of potentially stored patient data
- Providing audit trail of when systems were reset
- Preventing checkout of systems that haven't been reset
- Creating accountability for data sanitization

## Future Enhancements

Possible additions:
- Email notifications for upcoming resets
- Automatic system checkout blocking for overdue resets
- Maintenance history log
- Reset completion confirmation workflow
- Integration with maintenance ticketing system

## Questions or Issues

If you encounter any issues with this feature or have suggestions for improvements, please document them in the project issues log.
