// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://your-production-api.com/api';

// Socket.IO Configuration
export const SOCKET_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : 'https://your-production-api.com';

// API Headers
export const getAuthHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const getHeaders = () => ({
  'Content-Type': 'application/json',
});

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER_SCHOOL: '/auth/register/school',
    REGISTER_DRIVER: '/auth/register/driver',
    REGISTER_PARENT: '/auth/register/parent',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    LOGOUT: '/auth/logout',
  },
  
  // School Management
  SCHOOL: {
    DASHBOARD: '/school/dashboard',
    BUSES: '/school/buses',
    ROUTES: '/school/routes',
    USERS: '/school/users',
    SETTINGS: '/school/settings',
  },
  
  // Bus Management
  BUS: {
    LIST: '/bus',
    CREATE: '/bus',
    DETAILS: (id) => `/bus/${id}`,
    UPDATE: (id) => `/bus/${id}`,
    DELETE: (id) => `/bus/${id}`,
    ASSIGN_DRIVER: (id) => `/bus/${id}/assign-driver`,
    ASSIGN_ROUTE: (id) => `/bus/${id}/assign-route`,
  },
  
  // Route Management
  ROUTE: {
    LIST: '/route',
    CREATE: '/route',
    DETAILS: (id) => `/route/${id}`,
    UPDATE: (id) => `/route/${id}`,
    DELETE: (id) => `/route/${id}`,
    STOPS: (id) => `/route/${id}/stops`,
    ADD_STOP: (id) => `/route/${id}/stops`,
    UPDATE_STOP: (routeId, stopId) => `/route/${routeId}/stops/${stopId}`,
    DELETE_STOP: (routeId, stopId) => `/route/${routeId}/stops/${stopId}`,
  },
  
  // Driver Management
  DRIVER: {
    DASHBOARD: '/driver/dashboard',
    BUS_INFO: '/driver/bus',
    UPDATE_LOCATION: '/location/update',
    START_TRACKING: '/location/bus/:busId/tracking',
    STOP_TRACKING: '/location/bus/:busId/tracking',
    NEXT_STOP: '/driver/next-stop',
    ARRIVED_AT_STOP: '/driver/arrived-at-stop',
  },
  
  // Parent Management
  PARENT: {
    DASHBOARD: '/parent/dashboard',
    SELECT_STOP: '/parent/select-stop',
    ETA: '/parent/eta',
    NOTIFICATIONS: '/parent/notifications',
    CHILDREN: '/parent/children',
  },
  
  // Location Tracking
  LOCATION: {
    BUS_LOCATION: (busId) => `/location/bus/${busId}`,
    ETA: (busId, stopIndex) => `/location/eta/${busId}/${stopIndex}`,
    HISTORY: (busId) => `/location/history/${busId}`,
    SCHOOL_BUSES: (schoolId) => `/location/school/${schoolId}/buses`,
  },
  
  // Notifications
  NOTIFICATION: {
    REGISTER_TOKEN: '/notification/register-token',
    PREFERENCES: '/notification/preferences',
    HISTORY: '/notification/history',
  },
};

// API Response Status Codes
export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// API Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  TIMEOUT: 'Request timeout. Please try again.',
};

// API Request Timeout (in milliseconds)
export const REQUEST_TIMEOUT = 30000;

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  UPLOAD_URL: '/upload',
};

// Pagination Configuration
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
};

// Cache Configuration
export const CACHE_CONFIG = {
  USER_PROFILE_TTL: 5 * 60 * 1000, // 5 minutes
  BUS_LOCATION_TTL: 30 * 1000, // 30 seconds
  ROUTE_DATA_TTL: 10 * 60 * 1000, // 10 minutes
  ETA_CACHE_TTL: 60 * 1000, // 1 minute
};

// WebSocket Events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Location Updates
  LOCATION_UPDATE: 'location_update',
  BUS_STATUS_UPDATE: 'bus_status_update',
  BUS_APPROACHING_STOP: 'bus_approaching_stop',
  BUS_ARRIVED_AT_STOP: 'bus_arrived_at_stop',
  
  // Driver Events
  GET_NEXT_STOP: 'get_next_stop',
  NEXT_STOP: 'next_stop',
  ARRIVED_AT_STOP: 'arrived_at_stop',
  
  // Parent Events
  REQUEST_ETA: 'request_eta',
  ETA_RESPONSE: 'eta_response',
  SELECT_STOP: 'select_stop',
  STOP_SELECTED: 'stop_selected',
  
  // General
  ERROR: 'error',
  MESSAGE: 'message',
};

// Environment Configuration
export const ENV = {
  IS_DEV: __DEV__,
  IS_PROD: !__DEV__,
  API_URL: API_BASE_URL,
  SOCKET_URL: SOCKET_URL,
};

// Feature Flags
export const FEATURES = {
  REAL_TIME_TRACKING: true,
  PUSH_NOTIFICATIONS: true,
  TRAFFIC_INTEGRATION: true,
  OFFLINE_MODE: false,
  ANALYTICS: true,
  MULTI_LANGUAGE: false,
};

// Analytics Events
export const ANALYTICS_EVENTS = {
  USER_LOGIN: 'user_login',
  USER_REGISTER: 'user_register',
  BUS_TRACKING_START: 'bus_tracking_start',
  BUS_TRACKING_STOP: 'bus_tracking_stop',
  LOCATION_UPDATE: 'location_update',
  ETA_REQUEST: 'eta_request',
  NOTIFICATION_RECEIVED: 'notification_received',
  ROUTE_VIEWED: 'route_viewed',
  STOP_SELECTED: 'stop_selected',
}; 