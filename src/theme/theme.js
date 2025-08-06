import { DefaultTheme } from 'react-native-paper';

// Create a simple, compatible theme
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1976D2',
    secondary: '#FF6B35',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    error: '#D32F2F',
    warning: '#F57C00',
    success: '#388E3C',
    text: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
    divider: '#EEEEEE',
    // Bus status colors
    busActive: '#4CAF50',
    busInactive: '#9E9E9E',
    busMaintenance: '#FF9800',
    busOffline: '#F44336',
    // Direction colors
    toSchool: '#2196F3',
    fromSchool: '#FF9800',
    // Traffic colors
    trafficLight: '#4CAF50',
    trafficModerate: '#FF9800',
    trafficHeavy: '#F44336',
  },
  // Spacing values
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  // Border radius values
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50,
  },
  // Simple shadows without complex references
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6.27,
      elevation: 10,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 8.84,
      elevation: 15,
    },
  },
  // Custom styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  button: {
    primary: {
      backgroundColor: '#1976D2',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    secondary: {
      backgroundColor: '#FF6B35',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#1976D2',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  // Map styles
  map: {
    busMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#1976D2',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    stopMarker: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#FF6B35',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    schoolMarker: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#4CAF50',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: '#FFFFFF',
    },
  },
  // Status indicators
  status: {
    active: {
      backgroundColor: '#4CAF50',
      color: '#FFFFFF',
    },
    inactive: {
      backgroundColor: '#9E9E9E',
      color: '#FFFFFF',
    },
    maintenance: {
      backgroundColor: '#FF9800',
      color: '#FFFFFF',
    },
    offline: {
      backgroundColor: '#F44336',
      color: '#FFFFFF',
    },
  },
  // ETA styles
  eta: {
    onTime: {
      backgroundColor: '#4CAF50',
      color: '#FFFFFF',
    },
    delayed: {
      backgroundColor: '#FF9800',
      color: '#FFFFFF',
    },
    early: {
      backgroundColor: '#2196F3',
      color: '#FFFFFF',
    },
  },
};

// Helper functions
export const createStyles = (styles) => styles;

export const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return theme.colors.busActive;
    case 'inactive':
      return theme.colors.busInactive;
    case 'maintenance':
      return theme.colors.busMaintenance;
    case 'offline':
      return theme.colors.busOffline;
    default:
      return theme.colors.busInactive;
  }
};

export const getDirectionColor = (direction) => {
  switch (direction) {
    case 'to_school':
      return theme.colors.toSchool;
    case 'from_school':
      return theme.colors.fromSchool;
    default:
      return theme.colors.textSecondary;
  }
};

export const getTrafficColor = (level) => {
  switch (level) {
    case 'light':
      return theme.colors.trafficLight;
    case 'moderate':
      return theme.colors.trafficModerate;
    case 'heavy':
      return theme.colors.trafficHeavy;
    default:
      return theme.colors.trafficLight;
  }
};

export const getETAColor = (etaStatus) => {
  switch (etaStatus) {
    case 'on_time':
      return theme.colors.success;
    case 'delayed':
      return theme.colors.warning;
    case 'early':
      return theme.colors.info;
    default:
      return theme.colors.textSecondary;
  }
}; 