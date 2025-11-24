import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

const SYSTEMS_COLLECTION = 'systems';

export const systemsService = {
  // Create a new system
  async createSystem(systemData) {
    const docRef = await addDoc(collection(db, SYSTEMS_COLLECTION), {
      ...systemData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // Update a system
  async updateSystem(systemId, systemData) {
    const systemRef = doc(db, SYSTEMS_COLLECTION, systemId);
    await updateDoc(systemRef, {
      ...systemData,
      updatedAt: new Date().toISOString()
    });
  },

  // Delete a system
  async deleteSystem(systemId) {
    const systemRef = doc(db, SYSTEMS_COLLECTION, systemId);
    await deleteDoc(systemRef);
  },

  // Get a single system
  async getSystem(systemId) {
    const systemRef = doc(db, SYSTEMS_COLLECTION, systemId);
    const systemDoc = await getDoc(systemRef);
    if (systemDoc.exists()) {
      return { id: systemDoc.id, ...systemDoc.data() };
    }
    return null;
  },

  // Get all systems
  async getAllSystems() {
    const systemsSnapshot = await getDocs(collection(db, SYSTEMS_COLLECTION));
    return systemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Get available systems
  async getAvailableSystems() {
    const q = query(
      collection(db, SYSTEMS_COLLECTION),
      where('available', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Subscribe to systems changes (real-time)
  subscribeToSystems(callback) {
    const q = query(collection(db, SYSTEMS_COLLECTION), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const systems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(systems);
    });
  },

  // Subscribe to available systems (real-time)
  subscribeToAvailableSystems(callback) {
    const q = query(
      collection(db, SYSTEMS_COLLECTION),
      where('available', '==', true),
      orderBy('name')
    );
    return onSnapshot(q, (snapshot) => {
      const systems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(systems);
    });
  },

  // Set system availability
  async setAvailability(systemId, available) {
    const systemRef = doc(db, SYSTEMS_COLLECTION, systemId);
    await updateDoc(systemRef, {
      available,
      updatedAt: new Date().toISOString()
    });
  }
};
