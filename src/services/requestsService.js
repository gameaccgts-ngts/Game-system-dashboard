import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { systemsService } from './systemsService';

const REQUESTS_COLLECTION = 'requests';
const NOTIFICATIONS_COLLECTION = 'notifications';

export const requestsService = {
  // Create a new request
  async createRequest(requestData, userId, userInfo) {
    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), {
      ...requestData,
      userId,
      userName: userInfo.displayName,
      userDepartment: userInfo.department,
      userEmail: userInfo.email,
      status: requestData.flagged ? 'pending_review' : 'pending_confirmation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // Update request status
  async updateRequestStatus(requestId, status, systemId = null) {
    const batch = writeBatch(db);
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);

    batch.update(requestRef, {
      status,
      updatedAt: new Date().toISOString()
    });

    // If checking out, mark system as unavailable
    if (status === 'checked_out' && systemId) {
      const systemRef = doc(db, 'systems', systemId);
      batch.update(systemRef, {
        available: false,
        updatedAt: new Date().toISOString()
      });
      batch.update(requestRef, {
        checkedOutAt: new Date().toISOString()
      });
    }

    // If returned, mark system as available
    if (status === 'returned' && systemId) {
      const systemRef = doc(db, 'systems', systemId);
      batch.update(systemRef, {
        available: true,
        updatedAt: new Date().toISOString()
      });
      batch.update(requestRef, {
        returnedAt: new Date().toISOString()
      });
    }

    await batch.commit();
  },

  // User initiates return (creates notification for admin)
  async initiateReturn(requestId, userId) {
    const batch = writeBatch(db);

    // Update request status to pending_return
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    batch.update(requestRef, {
      status: 'pending_return',
      returnInitiatedAt: new Date().toISOString(),
      returnInitiatedBy: userId,
      updatedAt: new Date().toISOString()
    });

    // Create notification for admins
    const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
    batch.set(notificationRef, {
      type: 'return_request',
      requestId,
      userId,
      message: 'User has requested to return a system',
      read: false,
      createdAt: new Date().toISOString()
    });

    await batch.commit();
  },

  // Admin confirms return
  async confirmReturn(requestId, systemId) {
    await this.updateRequestStatus(requestId, 'returned', systemId);
  },

  // Get request by ID
  async getRequest(requestId) {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);
    if (requestDoc.exists()) {
      return { id: requestDoc.id, ...requestDoc.data() };
    }
    return null;
  },

  // Get all requests
  async getAllRequests() {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Get user's requests
  async getUserRequests(userId) {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Get checked out requests
  async getCheckedOutRequests() {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('status', '==', 'checked_out'),
      orderBy('checkedOutAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Get overdue returns (checked out for more than 7 days)
  async getOverdueReturns() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('status', '==', 'checked_out'),
      where('checkedOutAt', '<=', sevenDaysAgo.toISOString())
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Get return history
  async getReturnHistory(limit = 50) {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('status', '==', 'returned'),
      orderBy('returnedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Subscribe to all requests (real-time)
  subscribeToRequests(callback) {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(requests);
    });
  },

  // Subscribe to user's requests (real-time)
  subscribeToUserRequests(userId, callback) {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(requests);
    });
  },

  // Subscribe to pending returns (real-time)
  subscribeToPendingReturns(callback) {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('status', '==', 'pending_return'),
      orderBy('returnInitiatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(requests);
    });
  },

  // Get unread notifications count
  subscribeToNotifications(callback) {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(notifications);
    });
  },

  // Mark notification as read
  async markNotificationRead(notificationId) {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date().toISOString()
    });
  }
};
