
import { db, collection, getDocs, setDoc, doc, deleteDoc, updateDoc, getDoc, onSnapshot, query } from './firebase';

const IS_DEMO_KEY = "AIzaSy_REPLACE_WITH_WEB_API_KEY";

const localEmitter = new EventTarget();
const NOTIFY_CHANGE = 'data_change';
const NOTIFY_USER_CHANGE = 'user_change';

let cloudState: 'connected' | 'error' | 'not_found' | 'loading' = 'loading';
let lastErrorMessage = "";

const DEFAULT_ADMIN = { 
    id: 'admin-main', 
    name: 'Administrador Olpar', 
    pin: '2025', 
    avatarColor: 'bg-slate-900', 
    role: 'admin' 
};

export const persistence = {
  isCloudEnabled: (): boolean => {
    const config = (window as any).firebaseConfig || {};
    return config.apiKey && 
           config.apiKey !== IS_DEMO_KEY && 
           config.apiKey.startsWith("AIzaSy") && 
           config.apiKey.length > 30 &&
           cloudState !== 'not_found';
  },

  getCloudStatus: () => ({ state: cloudState, message: lastErrorMessage }),

  async getRecords(): Promise<any[]> {
    try {
      if (this.isCloudEnabled()) {
        const q = query(collection(db, "records"));
        const snap = await getDocs(q);
        cloudState = 'connected';
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e: any) {
      this.handleCloudError(e);
    }
    const local = localStorage.getItem('olpar360_records');
    return local ? JSON.parse(local) : [];
  },

  handleCloudError(e: any) {
    if (e?.code === 'not-found' || e?.message?.includes('database (default) does not exist')) {
        cloudState = 'not_found';
        lastErrorMessage = "La base de datos de Firestore no ha sido creada.";
    } else if (e?.code === 'permission-denied') {
        cloudState = 'error';
        lastErrorMessage = "Permisos denegados en Firestore.";
    } else {
        console.warn("Firestore sync issue:", e);
    }
  },

  async saveRecord(id: string, data: any): Promise<void> {
    if (this.isCloudEnabled()) {
      try {
        await setDoc(doc(db, "records", id), data);
        cloudState = 'connected';
        return;
      } catch (e) {
        this.handleCloudError(e);
      }
    }
    const records = await this.getRecords();
    const index = records.findIndex(r => r.id === id);
    if (index > -1) records[index] = data;
    else records.push(data);
    localStorage.setItem('olpar360_records', JSON.stringify(records));
    localEmitter.dispatchEvent(new Event(NOTIFY_CHANGE));
  },

  async deleteRecord(id: string): Promise<void> {
    if (this.isCloudEnabled()) {
      try {
        await deleteDoc(doc(db, "records", id));
        return;
      } catch (e) { this.handleCloudError(e); }
    }
    const records = await this.getRecords();
    const filtered = records.filter(r => r.id !== id);
    localStorage.setItem('olpar360_records', JSON.stringify(filtered));
    localEmitter.dispatchEvent(new Event(NOTIFY_CHANGE));
  },

  async getRecordById(id: string): Promise<any | null> {
    if (this.isCloudEnabled()) {
      try {
        const snap = await getDoc(doc(db, "records", id));
        if (snap.exists()) return { id: snap.id, ...snap.data() };
      } catch (e) { this.handleCloudError(e); }
    }
    const records = await this.getRecords();
    return records.find(r => r.id === id) || null;
  },

  onRecordsUpdate(callback: (records: any[]) => void): () => void {
    if (this.isCloudEnabled()) {
      try {
        return onSnapshot(collection(db, "records"), (snap) => {
          cloudState = 'connected';
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          callback(list);
        }, (err) => {
          this.handleCloudError(err);
          const data = JSON.parse(localStorage.getItem('olpar360_records') || '[]');
          callback(data);
        });
      } catch (e) { this.handleCloudError(e); }
    }
    const handler = async () => callback(await this.getRecords());
    localEmitter.addEventListener(NOTIFY_CHANGE, handler);
    handler(); 
    return () => localEmitter.removeEventListener(NOTIFY_CHANGE, handler);
  },

  // --- MÉTODOS DE USUARIO MEJORADOS ---

  async getUsers(): Promise<any[]> {
    let usersList: any[] = [];
    if (this.isCloudEnabled()) {
        try {
            const snap = await getDocs(collection(db, "users"));
            if (!snap.empty) {
                usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) { this.handleCloudError(e); }
    }
    
    if (usersList.length === 0) {
        const local = localStorage.getItem('olpar360_users');
        usersList = local ? JSON.parse(local) : [DEFAULT_ADMIN];
    }

    // Si por alguna razón sigue vacío o no contiene al admin principal, lo forzamos
    if (!usersList.some(u => u.role === 'admin')) {
        usersList.unshift(DEFAULT_ADMIN);
    }

    return usersList;
  },

  async saveUser(user: any): Promise<void> {
    if (this.isCloudEnabled()) {
      try {
        await setDoc(doc(db, "users", user.id), user);
        return;
      } catch (e) { this.handleCloudError(e); }
    }
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) users[index] = user;
    else users.push(user);
    localStorage.setItem('olpar360_users', JSON.stringify(users));
    localEmitter.dispatchEvent(new Event(NOTIFY_USER_CHANGE));
  },

  async deleteUser(userId: string): Promise<void> {
    if (this.isCloudEnabled()) {
      try {
        await deleteDoc(doc(db, "users", userId));
        return;
      } catch (e) { this.handleCloudError(e); }
    }
    const users = await this.getUsers();
    const filtered = users.filter(u => u.id !== userId);
    localStorage.setItem('olpar360_users', JSON.stringify(filtered));
    localEmitter.dispatchEvent(new Event(NOTIFY_USER_CHANGE));
  },

  onUsersUpdate(callback: (users: any[]) => void): () => void {
    if (this.isCloudEnabled()) {
      try {
        return onSnapshot(collection(db, "users"), (snap) => {
          let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (list.length === 0) {
              list = [DEFAULT_ADMIN];
          } else if (!list.some(u => u.role === 'admin')) {
              list.unshift(DEFAULT_ADMIN);
          }
          callback(list);
        }, (err) => {
            this.handleCloudError(err);
            this.getUsers().then(callback);
        });
      } catch (e) { 
          this.handleCloudError(e);
      }
    }
    const handler = async () => callback(await this.getUsers());
    localEmitter.addEventListener(NOTIFY_USER_CHANGE, handler);
    handler();
    return () => localEmitter.removeEventListener(NOTIFY_USER_CHANGE, handler);
  }
};
