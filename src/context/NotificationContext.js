import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_BASE_URL, ENDPOINTS, getAuthHeaders } from '../config/api';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
    
    // Listen for notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      addNotificationToList(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('bus-notifications', {
        name: 'Bus Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo push token:', token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    setExpoPushToken(token);
    return token;
  };

  const registerTokenWithServer = async (token, userToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.NOTIFICATION.REGISTER_TOKEN}`, {
        method: 'POST',
        headers: getAuthHeaders(userToken),
        body: JSON.stringify({
          pushToken: token,
          deviceType: Platform.OS,
        }),
      });

      if (response.ok) {
        setIsRegistered(true);
        return true;
      } else {
        console.error('Failed to register push token with server');
        return false;
      }
    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  };

  const unregisterTokenFromServer = async (userToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.NOTIFICATION.REGISTER_TOKEN}`, {
        method: 'DELETE',
        headers: getAuthHeaders(userToken),
      });

      if (response.ok) {
        setIsRegistered(false);
        return true;
      } else {
        console.error('Failed to unregister push token from server');
        return false;
      }
    } catch (error) {
      console.error('Error unregistering push token:', error);
      return false;
    }
  };

  const sendLocalNotification = async (title, body, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  };

  const scheduleNotification = async (title, body, trigger, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  };

  const getNotificationHistory = async (userToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.NOTIFICATION.HISTORY}`, {
        headers: getAuthHeaders(userToken),
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        return data.notifications;
      } else {
        console.error('Failed to fetch notification history');
        return [];
      }
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  };

  const updateNotificationPreferences = async (preferences, userToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.NOTIFICATION.PREFERENCES}`, {
        method: 'PUT',
        headers: getAuthHeaders(userToken),
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        return true;
      } else {
        console.error('Failed to update notification preferences');
        return false;
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  };

  const addNotificationToList = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
  };

  const handleNotificationResponse = (response) => {
    const { data } = response.notification.request.content;
    
    // Handle different notification types
    switch (data.type) {
      case 'bus_approaching':
        // Navigate to ETA screen or show bus location
        console.log('Bus approaching notification tapped:', data);
        break;
      case 'bus_arrived':
        // Show arrival confirmation
        console.log('Bus arrived notification tapped:', data);
        break;
      case 'eta_update':
        // Update ETA display
        console.log('ETA update notification tapped:', data);
        break;
      case 'emergency_alert':
        // Show emergency information
        console.log('Emergency alert notification tapped:', data);
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    expoPushToken,
    notification,
    notifications,
    isRegistered,
    registerTokenWithServer,
    unregisterTokenFromServer,
    sendLocalNotification,
    scheduleNotification,
    cancelAllNotifications,
    getNotificationHistory,
    updateNotificationPreferences,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 