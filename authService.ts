
import { User, KycResult, DeviceIntel } from '../types';

const STORAGE_KEY_USERS = 'sentinel_users';
const STORAGE_KEY_SESSION = 'sentinel_session';

// Simple hash simulation for demo security (prevent plain text passwords)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

export const registerUser = (name: string, email: string, password: string): User => {
  const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
  const users: any[] = usersStr ? JSON.parse(usersStr) : [];
  
  if (users.find((u: any) => u.email === email)) {
    throw new Error("User already exists");
  }

  const hashedPassword = simpleHash(password);

  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    email,
    // @ts-ignore - simulating stored password
    password: hashedPassword,
    isVerified: false,
    kycResult: null,
    history: [],
    deviceHistory: [],
    accountCreated: Date.now()
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  
  // Note: We do NOT set session here. User must manually login.
  // @ts-ignore
  const { password: _, ...userWithoutPassword } = newUser;
  
  return userWithoutPassword;
};

export const loginUser = (email: string, password: string): User => {
  const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
  const users: any[] = usersStr ? JSON.parse(usersStr) : [];
  
  const hashedPassword = simpleHash(password);
  
  // Strict matching ensures users only access their own account data
  const user = users.find((u: any) => u.email === email && u.password === hashedPassword);
  
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Ensure arrays exist for legacy users
  if (!user.history) user.history = [];
  if (!user.deviceHistory) user.deviceHistory = [];

  const { password: _, ...userWithoutPassword } = user;
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userWithoutPassword));
  
  return userWithoutPassword;
};

// --- PERMANENT STORAGE HANDLERS ---

export const updateUserSecurityStats = (userId: string, deviceIntel: DeviceIntel) => {
  const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
  if (!usersStr) return;
  
  let users: any[] = JSON.parse(usersStr);
  
  users = users.map(u => {
    if (u.id === userId) {
      // Check if this specific device/IP combo is already logged to avoid dupes, or just log everything
      const history = u.deviceHistory || [];
      // Only add if it's been more than 1 hour or a different IP
      const lastEntry = history.length > 0 ? history[0] : null;
      
      let newHistory = history;
      if (!lastEntry || lastEntry.ip !== deviceIntel.ip || (Date.now() - lastEntry.lastSeen > 3600000)) {
         newHistory = [deviceIntel, ...history].slice(0, 50); // Keep last 50 records
      }

      return { 
        ...u, 
        lastKnownDevice: deviceIntel,
        deviceHistory: newHistory
      };
    }
    return u;
  });
  
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  
  // Update Session
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    const updated = { ...currentUser, lastKnownDevice: deviceIntel, deviceHistory: users.find((u:any) => u.id === userId).deviceHistory };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
  }
};

export const logoutUser = () => {
  // Completely clear session to protect privacy on shared devices
  localStorage.removeItem(STORAGE_KEY_SESSION);
};

export const getCurrentUser = (): User | null => {
  const sessionStr = localStorage.getItem(STORAGE_KEY_SESSION);
  if (!sessionStr) return null;
  
  try {
    const user = JSON.parse(sessionStr);
    if (!user.history) user.history = []; 
    if (!user.deviceHistory) user.deviceHistory = [];
    return user;
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    return null;
  }
};

export const updateUserKycStatus = (userId: string, result: KycResult) => {
  const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
  if (!usersStr) return;
  
  let users: any[] = JSON.parse(usersStr);
  
  // Update ONLY the specific user's record
  users = users.map(u => {
    if (u.id === userId) {
      const newHistory = [result, ...(u.history || [])];
      return { 
        ...u, 
        isVerified: u.isVerified || result.riskLevel !== 'High', 
        kycResult: result,
        history: newHistory
      };
    }
    return u;
  });
  
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  
  // Update session if it's the current user to reflect changes immediately
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    const updatedUser = { 
        ...currentUser, 
        isVerified: currentUser.isVerified || result.riskLevel !== 'High',
        kycResult: result,
        history: [result, ...(currentUser.history || [])]
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updatedUser));
  }
};
