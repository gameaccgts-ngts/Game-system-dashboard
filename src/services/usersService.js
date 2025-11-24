import { db } from '../config/firebase';
import {
  collection,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  where
} from 'firebase/firestore';

export const usersService = {
  /**
   * Subscribe to all users
   */
  subscribeToUsers(callback) {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(users);
    });
  },

  /**
   * Update user role (admin/user)
   */
  async updateUserRole(userId, role) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: role,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Toggle user active status
   */
  async toggleUserStatus(userId, isActive) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isActive: isActive,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Update user department
   */
  async updateUserDepartment(userId, department) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      department: department,
      updatedAt: new Date().toISOString()
    });
  }
};
