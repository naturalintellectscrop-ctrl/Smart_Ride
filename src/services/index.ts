// ============================================
// SMART RIDE - SERVICES INDEX
// ============================================

export { api } from './api';
export { socketService } from './socket';
export type {
  SocketEventMap,
  TaskStatus,
  SocketTask,
  LocationData,
  DriverRequestData,
  TaskStatusUpdateData,
  RiderTaskMatchedData,
  NotificationData,
  ConnectionEstablishedData,
} from './socket';
export { notificationService } from './notifications';
export { 
  signInWithGoogle, 
  signOutFromGoogle, 
  signInSilently, 
  isGoogleSignedIn, 
  getCurrentGoogleUser,
  configureGoogleSignIn,
} from './google-signin';
