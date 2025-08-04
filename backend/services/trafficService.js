const axios = require('axios');

// Google Maps API key (you'll need to set this in environment variables)
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Calculate traffic-aware ETA using Google Maps Directions API
const calculateTrafficETA = async (originLat, originLng, destLat, destLng) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured, using basic ETA calculation');
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json`;
    const params = {
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      mode: 'driving',
      traffic_model: 'best_guess',
      departure_time: 'now',
      key: GOOGLE_MAPS_API_KEY
    };

    const response = await axios.get(url, { params });
    
    if (response.data.status !== 'OK') {
      console.error('Google Maps API error:', response.data.status);
      return null;
    }

    const route = response.data.routes[0];
    if (!route || !route.legs[0]) {
      return null;
    }

    const leg = route.legs[0];
    const durationInTraffic = leg.duration_in_traffic || leg.duration;
    const durationInTrafficValue = durationInTraffic.value; // seconds
    const durationInTrafficText = durationInTraffic.text;

    // Calculate traffic delay
    const distance = leg.distance.value / 1000; // km
    const averageSpeed = 30; // km/h (assumed average speed without traffic)
    const expectedDuration = (distance / averageSpeed) * 3600; // seconds
    const trafficDelay = Math.max(0, durationInTrafficValue - expectedDuration);

    return {
      etaMinutes: Math.round(durationInTrafficValue / 60),
      etaText: durationInTrafficText,
      distance: Math.round(distance * 100) / 100,
      trafficDelay: Math.round(trafficDelay / 60), // minutes
      hasTraffic: trafficDelay > 0
    };
  } catch (error) {
    console.error('Error calculating traffic ETA:', error.message);
    return null;
  }
};

// Calculate ETA for multiple waypoints
const calculateRouteETA = async (waypoints) => {
  try {
    if (!GOOGLE_MAPS_API_KEY || waypoints.length < 2) {
      return null;
    }

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const waypointsParam = waypoints.slice(1, -1).map(wp => `${wp.lat},${wp.lng}`).join('|');

    const url = `https://maps.googleapis.com/maps/api/directions/json`;
    const params = {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      waypoints: waypointsParam,
      mode: 'driving',
      traffic_model: 'best_guess',
      departure_time: 'now',
      key: GOOGLE_MAPS_API_KEY
    };

    const response = await axios.get(url, { params });
    
    if (response.data.status !== 'OK') {
      console.error('Google Maps API error:', response.data.status);
      return null;
    }

    const route = response.data.routes[0];
    if (!route || !route.legs) {
      return null;
    }

    const etas = [];
    let cumulativeTime = 0;

    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i];
      const durationInTraffic = leg.duration_in_traffic || leg.duration;
      cumulativeTime += durationInTraffic.value;

      etas.push({
        waypointIndex: i,
        etaMinutes: Math.round(cumulativeTime / 60),
        etaText: durationInTraffic.text,
        distance: Math.round(leg.distance.value / 1000 * 100) / 100,
        trafficDelay: Math.max(0, (durationInTraffic.value - (leg.distance.value / 1000 / 30 * 3600)) / 60)
      });
    }

    return etas;
  } catch (error) {
    console.error('Error calculating route ETA:', error.message);
    return null;
  }
};

// Get real-time traffic conditions for a route
const getTrafficConditions = async (originLat, originLng, destLat, destLng) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json`;
    const params = {
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      mode: 'driving',
      traffic_model: 'best_guess',
      departure_time: 'now',
      alternatives: true,
      key: GOOGLE_MAPS_API_KEY
    };

    const response = await axios.get(url, { params });
    
    if (response.data.status !== 'OK') {
      return null;
    }

    const routes = response.data.routes;
    const trafficConditions = [];

    for (const route of routes) {
      const leg = route.legs[0];
      const durationInTraffic = leg.duration_in_traffic || leg.duration;
      const duration = leg.duration;

      const trafficLevel = durationInTraffic.value > duration.value * 1.2 ? 'heavy' :
                          durationInTraffic.value > duration.value * 1.1 ? 'moderate' : 'light';

      trafficConditions.push({
        routeIndex: route.legs[0].via_waypoint ? route.legs[0].via_waypoint[0].step_index : 0,
        trafficLevel,
        delayMinutes: Math.round((durationInTraffic.value - duration.value) / 60),
        duration: Math.round(durationInTraffic.value / 60),
        distance: Math.round(leg.distance.value / 1000 * 100) / 100
      });
    }

    return trafficConditions;
  } catch (error) {
    console.error('Error getting traffic conditions:', error.message);
    return null;
  }
};

// Calculate basic ETA without traffic (fallback)
const calculateBasicETA = (originLat, originLng, destLat, destLng, averageSpeed = 30) => {
  try {
    // Haversine formula to calculate distance
    const R = 6371; // Earth's radius in kilometers
    const dLat = (destLat - originLat) * Math.PI / 180;
    const dLon = (destLng - originLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    const etaMinutes = Math.round((distance / averageSpeed) * 60);

    return {
      etaMinutes,
      distance: Math.round(distance * 100) / 100,
      trafficDelay: 0,
      hasTraffic: false
    };
  } catch (error) {
    console.error('Error calculating basic ETA:', error.message);
    return null;
  }
};

// Get optimal route considering traffic
const getOptimalRoute = async (originLat, originLng, destLat, destLng) => {
  try {
    const trafficConditions = await getTrafficConditions(originLat, originLng, destLat, destLng);
    
    if (!trafficConditions || trafficConditions.length === 0) {
      return calculateBasicETA(originLat, originLng, destLat, destLng);
    }

    // Find route with least traffic
    const bestRoute = trafficConditions.reduce((best, current) => {
      return current.delayMinutes < best.delayMinutes ? current : best;
    });

    return {
      etaMinutes: bestRoute.duration,
      distance: bestRoute.distance,
      trafficDelay: bestRoute.delayMinutes,
      hasTraffic: bestRoute.trafficLevel !== 'light',
      trafficLevel: bestRoute.trafficLevel
    };
  } catch (error) {
    console.error('Error getting optimal route:', error.message);
    return calculateBasicETA(originLat, originLng, destLat, destLng);
  }
};

module.exports = {
  calculateTrafficETA,
  calculateRouteETA,
  getTrafficConditions,
  calculateBasicETA,
  getOptimalRoute
}; 