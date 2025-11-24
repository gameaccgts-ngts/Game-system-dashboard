# Firebase Setup Guide for Game System Checkout

This guide will walk you through setting up Firebase for the Game System Checkout application.

## Prerequisites

- Node.js and npm installed
- A Google account for Firebase

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "game-system-checkout")
4. Follow the setup wizard (you can disable Google Analytics if not needed)
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project, click the **Web** icon (`</>`) to add a web app
2. Enter an app nickname (e.g., "Game System Checkout Web")
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object - you'll need this for the `.env` file

## Step 3: Enable Authentication

1. In the Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Enable **Email/Password** authentication
5. Click "Save"

## Step 4: Create Firestore Database

1. In the Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Select **Start in test mode** (we'll add security rules later)
4. Choose a location (select the closest to your users)
5. Click "Enable"

## Step 5: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase configuration from Step 2:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Step 6: Deploy Firestore Security Rules

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select **Firestore** (use spacebar to select)
   - Choose "Use an existing project"
   - Select your project from the list
   - Accept the default `firestore.rules` file
   - Accept the default `firestore.indexes.json` file

4. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Step 7: Create an Admin User

Since the first user will be created with the default role of "user", you need to manually promote them to admin:

1. Create your first user account through the app
2. Go to Firebase Console → **Build** → **Firestore Database**
3. Find the `users` collection
4. Find your user document (by email)
5. Edit the document and change `role` from `"user"` to `"admin"`
6. Save the changes

## Step 8: Seed Initial Data (Optional)

You can manually add systems through the admin interface, or use the Firebase Console:

1. Go to **Firestore Database**
2. Click "Start collection"
3. Collection ID: `systems`
4. Add documents with the following structure:

```json
{
  "name": "PS5 Cart #1",
  "type": "PS5 Cart",
  "controllers": 4,
  "serialNumber": "PS5C-2024-0001",
  "cables": {
    "hdmi": true,
    "ethernet": true,
    "usb": true,
    "power": true
  },
  "available": true,
  "storageLocation": "Cabinet B-1",
  "systemReset": "2025-02-15",
  "lastMaintenance": "2025-01-12",
  "createdAt": "2025-01-24T00:00:00.000Z"
}
```

## Step 9: Run the Application

```bash
npm install
npm run dev
```

The application should now be running at `http://localhost:5173`

## Firestore Collections Structure

### users
```javascript
{
  uid: string,
  email: string,
  displayName: string,
  department: string,
  role: "user" | "admin",
  createdAt: timestamp
}
```

### systems
```javascript
{
  name: string,
  type: string,
  controllers: number,
  serialNumber: string,
  cables: {
    hdmi: boolean,
    ethernet: boolean,
    usb: boolean,
    power: boolean
  },
  available: boolean,
  storageLocation: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### requests
```javascript
{
  userId: string,
  userName: string,
  userDepartment: string,
  userEmail: string,
  systemId: string,
  systemName: string,
  systemType: string,
  unit: string,
  room: string,
  startDate: string,
  endDate: string,
  purpose: string,
  controllers: number,
  status: "pending_confirmation" | "pending_review" | "confirmed" | "checked_out" | "pending_return" | "returned" | "rejected",
  flagged: boolean,
  flagReason: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  checkedOutAt: timestamp (optional),
  returnedAt: timestamp (optional),
  returnInitiatedAt: timestamp (optional),
  returnInitiatedBy: string (optional)
}
```

### notifications
```javascript
{
  type: "return_request",
  requestId: string,
  userId: string,
  message: string,
  read: boolean,
  createdAt: timestamp,
  readAt: timestamp (optional)
}
```

## User Workflow

### Regular User Flow:
1. Sign up / Login
2. Submit a new request (Request tab)
3. Wait for admin approval
4. Once checked out, view in "My Checkouts"
5. Click "Request Return" when done
6. Admin confirms return

### Admin Flow:
1. Login with admin account
2. Review pending requests in "Admin Queue" → "Request Queue"
3. Approve/Reject requests
4. Check out approved requests
5. Monitor returns in "Returns Management"
6. Confirm pending returns
7. View overdue returns (7+ days)
8. Manage system inventory

## Key Features

- **Authentication**: Email/password login with role-based access
- **Real-time Updates**: All data syncs in real-time using Firestore listeners
- **Return Workflow**: Users initiate returns, admins confirm them
- **Admin Notifications**: Bell icon shows pending return requests
- **AI Recommendations**: System recommendations based on event requirements
- **Conflict Prevention**: Systems become unavailable when checked out
- **Overdue Tracking**: Automatic flagging of returns over 7 days
- **Return History**: Complete audit trail of all transactions

## Troubleshooting

### Can't login
- Check that Email/Password authentication is enabled in Firebase Console
- Verify your `.env` file has correct Firebase credentials

### Security rules errors
- Make sure you deployed the firestore.rules file
- Check Firebase Console → Firestore → Rules tab

### Data not updating
- Check browser console for errors
- Verify Firestore indexes are created (Firebase will auto-prompt)

### Not seeing admin features
- Make sure your user's `role` field is set to `"admin"` in Firestore

## Production Deployment

Before deploying to production:

1. Review and test all security rules
2. Set up proper error monitoring (e.g., Sentry)
3. Enable Firebase Analytics (optional)
4. Set up custom domain in Firebase Hosting
5. Configure CORS if using external APIs
6. Review Firebase usage limits and billing

## Support

For issues or questions, check:
- Firebase Documentation: https://firebase.google.com/docs
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
