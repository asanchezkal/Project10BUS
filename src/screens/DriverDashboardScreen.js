import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  AppState,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { theme, getStatusColor, getDirectionColor } from '../theme/theme';
import { API_BASE_URL, ENDPOINTS, getAuthHeaders } from '../config/api';

const DriverDashboardScreen = () => {
  const { user, token } = useAuth();
  const { startLocationTracking, stopLocationTracking, isTracking } = useLocation();
  const [busInfo, setBusInfo] = useState(null);
  const [nextStop, setNextStop] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchBusInfo();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (isTracking) {
      const locationInterval = setInterval(updateLocation, 3 * 60 * 1000); // Every 3 minutes
      return () => clearInterval(locationInterval);
    }
  }, [isTracking, currentLocation]);

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      fetchBusInfo();
    }
    appState.current = nextAppState;
  };

  const fetchBusInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.DRIVER.BUS_INFO}`, {
        headers: getAuthHeaders(token),
      });

      if (response.ok) {
        const data = await response.json();
        setBusInfo(data.bus);
        if (data.bus.route) {
          fetchNextStop(data.bus.route._id, data.bus.currentStopIndex);
        }
      } else {
        Alert.alert('Error', 'Failed to fetch bus information');
      }
    } catch (error) {
      console.error('Error fetching bus info:', error);
      Alert.alert('Error', 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNextStop = async (routeId, currentStopIndex) => {
    try {
      const response = await fetch(`${API_BASE_URL}/route/${routeId}/stops`, {
        headers: getAuthHeaders(token),
      });

      if (response.ok) {
        const data = await response.json();
        const stops = data.stops;
        const nextIndex = (currentStopIndex + 1) % stops.length;
        setNextStop(stops[nextIndex]);
      }
    } catch (error) {
      console.error('Error fetching next stop:', error);
    }
  };

  const updateLocation = async () => {
    if (!currentLocation) return;

    try {
      setIsUpdatingLocation(true);
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.DRIVER.UPDATE_LOCATION}`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          heading: currentLocation.heading || 0,
          speed: currentLocation.speed || 0,
          accuracy: currentLocation.accuracy || 10,
        }),
      });

      if (response.ok) {
        setSnackbarMessage('Location updated successfully');
        setSnackbarVisible(true);
      } else {
        console.error('Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleStartTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for tracking');
        return;
      }

      await startLocationTracking((location) => {
        setCurrentLocation(location);
      });

      // Update bus status to active
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.DRIVER.START_TRACKING.replace(':busId', busInfo._id)}`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ action: 'start' }),
      });

      if (response.ok) {
        setSnackbarMessage('Tracking started');
        setSnackbarVisible(true);
        fetchBusInfo(); // Refresh bus info
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start tracking');
    }
  };

  const handleStopTracking = async () => {
    try {
      await stopLocationTracking();

      // Update bus status to inactive
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.DRIVER.STOP_TRACKING.replace(':busId', busInfo._id)}`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ action: 'stop' }),
      });

      if (response.ok) {
        setSnackbarMessage('Tracking stopped');
        setSnackbarVisible(true);
        fetchBusInfo(); // Refresh bus info
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert('Error', 'Failed to stop tracking');
    }
  };

  const handleArrivedAtStop = async () => {
    if (!nextStop) return;

    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.DRIVER.ARRIVED_AT_STOP}`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          stopIndex: busInfo.currentStopIndex,
        }),
      });

      if (response.ok) {
        setSnackbarMessage(`Arrived at ${nextStop.name}`);
        setSnackbarVisible(true);
        fetchBusInfo(); // Refresh bus info and next stop
      }
    } catch (error) {
      console.error('Error marking arrival:', error);
      Alert.alert('Error', 'Failed to mark arrival');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading bus information...</Text>
      </View>
    );
  }

  if (!busInfo) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
        <Title style={styles.errorTitle}>No Bus Assigned</Title>
        <Text style={styles.errorText}>
          You don't have a bus assigned to you. Please contact your school administrator.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Bus Status Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.busHeader}>
            <Ionicons name="bus" size={40} color={theme.colors.primary} />
            <View style={styles.busInfo}>
              <Title style={styles.busNumber}>Bus {busInfo.busNumber}</Title>
              <Chip
                mode="outlined"
                style={[styles.statusChip, { borderColor: getStatusColor(busInfo.status) }]}
                textStyle={{ color: getStatusColor(busInfo.status) }}
              >
                {busInfo.status.toUpperCase()}
              </Chip>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Route:</Text>
            <Text style={styles.infoValue}>{busInfo.route?.name || 'No route assigned'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Direction:</Text>
            <Chip
              mode="outlined"
              style={[styles.directionChip, { borderColor: getDirectionColor(busInfo.currentDirection) }]}
              textStyle={{ color: getDirectionColor(busInfo.currentDirection) }}
            >
              {busInfo.currentDirection === 'to_school' ? 'To School' : 'From School'}
            </Chip>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Stop:</Text>
            <Text style={styles.infoValue}>
              {busInfo.route?.stops?.[busInfo.currentStopIndex]?.name || 'Unknown'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Next Stop Card */}
      {nextStop && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Next Stop</Title>
            <View style={styles.nextStopInfo}>
              <Ionicons name="location" size={24} color={theme.colors.secondary} />
              <View style={styles.nextStopDetails}>
                <Text style={styles.nextStopName}>{nextStop.name}</Text>
                <Text style={styles.nextStopAddress}>
                  {nextStop.address?.street || 'Address not available'}
                </Text>
              </View>
            </View>
            <Button
              mode="contained"
              onPress={handleArrivedAtStop}
              style={styles.arrivedButton}
              icon="check-circle"
            >
              Mark as Arrived
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Location Tracking Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Location Tracking</Title>
          
          {currentLocation && (
            <View style={styles.locationInfo}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.locationText}>
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>
              {currentLocation.speed && (
                <View style={styles.locationRow}>
                  <Ionicons name="speedometer" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.locationText}>
                    {Math.round(currentLocation.speed * 3.6)} km/h
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.trackingButtons}>
            {!isTracking ? (
              <Button
                mode="contained"
                onPress={handleStartTracking}
                style={styles.startButton}
                icon="play"
                loading={isUpdatingLocation}
              >
                Start Tracking
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleStopTracking}
                style={styles.stopButton}
                icon="stop"
                loading={isUpdatingLocation}
              >
                Stop Tracking
              </Button>
            )}
          </View>

          {isTracking && (
            <Text style={styles.trackingNote}>
              Location is being shared every 3 minutes
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Quick Actions</Title>
          <View style={styles.quickActions}>
            <Button
              mode="outlined"
              onPress={fetchBusInfo}
              style={styles.actionButton}
              icon="refresh"
            >
              Refresh Info
            </Button>
            <Button
              mode="outlined"
              onPress={() => Alert.alert('Emergency', 'Emergency contact will be notified')}
              style={[styles.actionButton, styles.emergencyButton]}
              icon="alert"
            >
              Emergency
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  errorTitle: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  card: {
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    elevation: 4,
  },
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  busInfo: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  busNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  divider: {
    marginVertical: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  directionChip: {
    alignSelf: 'flex-end',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
  },
  nextStopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  nextStopDetails: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  nextStopName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  nextStopAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  arrivedButton: {
    marginTop: theme.spacing.md,
  },
  locationInfo: {
    marginBottom: theme.spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  locationText: {
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  trackingButtons: {
    marginBottom: theme.spacing.md,
  },
  startButton: {
    backgroundColor: theme.colors.success,
  },
  stopButton: {
    backgroundColor: theme.colors.error,
  },
  trackingNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
  },
  emergencyButton: {
    borderColor: theme.colors.error,
  },
  snackbar: {
    backgroundColor: theme.colors.primary,
  },
});

export default DriverDashboardScreen; 