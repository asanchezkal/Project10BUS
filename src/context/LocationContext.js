import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkLocationPermission();
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
      return status;
    } catch (error) {
      console.error('Error checking location permission:', error);
      setError('Failed to check location permission');
      return 'denied';
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      return status;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setError('Failed to request location permission');
      return 'denied';
    }
  };

  const startLocationTracking = async (onLocationUpdate) => {
    try {
      // Check permission first
      let status = await checkLocationPermission();
      if (status !== 'granted') {
        status = await requestLocationPermission();
        if (status !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      // Configure location options
      const locationOptions = {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 10, // 10 meters
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Bus Tracking Active',
          notificationBody: 'Location is being shared for bus tracking',
        },
      };

      // Start location updates
      const subscription = await Location.watchPositionAsync(
        locationOptions,
        (newLocation) => {
          const locationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy,
            heading: newLocation.coords.heading,
            speed: newLocation.coords.speed,
            timestamp: newLocation.timestamp,
          };

          setLocation(locationData);
          if (onLocationUpdate) {
            onLocationUpdate(locationData);
          }
        }
      );

      setLocationSubscription(subscription);
      setIsTracking(true);
      setError(null);

      return subscription;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setError(error.message);
      throw error;
    }
  };

  const stopLocationTracking = async () => {
    try {
      if (locationSubscription) {
        await locationSubscription.remove();
        setLocationSubscription(null);
      }
      setIsTracking(false);
      setError(null);
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      setError('Failed to stop location tracking');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        heading: currentLocation.coords.heading,
        speed: currentLocation.coords.speed,
        timestamp: currentLocation.timestamp,
      };

      setLocation(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      setError(error.message);
      throw error;
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
  };

  const isLocationNearStop = (busLocation, stopLocation, thresholdMeters = 500) => {
    if (!busLocation || !stopLocation) return false;
    
    const distance = calculateDistance(
      busLocation.latitude,
      busLocation.longitude,
      stopLocation.latitude,
      stopLocation.longitude
    );
    
    return distance * 1000 <= thresholdMeters; // Convert km to meters
  };

  const value = {
    location,
    isTracking,
    permissionStatus,
    error,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
    calculateDistance,
    calculateBearing,
    isLocationNearStop,
    requestLocationPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}; 