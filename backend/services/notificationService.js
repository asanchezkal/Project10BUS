const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// Send push notification to a single device
const sendPushNotification = async (pushToken, message) => {
  try {
    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      return false;
    }

    // Create the message
    const pushMessage = {
      to: pushToken,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: message.data || {},
      priority: 'high',
      channelId: 'bus-notifications'
    };

    // Send the message
    const chunks = expo.chunkPushNotifications([pushMessage]);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // Check for errors
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        console.error('Push notification error:', ticket.message);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

// Send push notification to multiple devices
const sendPushNotifications = async (pushTokens, message) => {
  try {
    const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));
    
    if (validTokens.length === 0) {
      console.warn('No valid push tokens provided');
      return false;
    }

    // Create messages for all valid tokens
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: message.data || {},
      priority: 'high',
      channelId: 'bus-notifications'
    }));

    // Send the messages
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // Check for errors
    let successCount = 0;
    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        successCount++;
      } else {
        console.error('Push notification error:', ticket.message);
      }
    }

    console.log(`Sent ${successCount}/${validTokens.length} push notifications successfully`);
    return successCount > 0;
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return false;
  }
};

// Send ETA notification to parents
const sendETANotification = async (parent, bus, stop, etaMinutes) => {
  try {
    if (!parent.parent.pushToken || !parent.parent.notificationPreferences.etaNotifications) {
      return false;
    }

    const message = {
      title: 'Bus ETA Update',
      body: `Bus ${bus.busNumber} will arrive at ${stop.name} in ${etaMinutes} minutes`,
      data: {
        type: 'eta_update',
        busId: bus._id.toString(),
        stopId: stop._id.toString(),
        etaMinutes,
        timestamp: new Date().toISOString()
      }
    };

    return await sendPushNotification(parent.parent.pushToken, message);
  } catch (error) {
    console.error('Error sending ETA notification:', error);
    return false;
  }
};

// Send arrival notification to parents
const sendArrivalNotification = async (parent, bus, stop) => {
  try {
    if (!parent.parent.pushToken || !parent.parent.notificationPreferences.arrivalNotifications) {
      return false;
    }

    const message = {
      title: 'Bus Arrived',
      body: `Bus ${bus.busNumber} has arrived at ${stop.name}`,
      data: {
        type: 'bus_arrived',
        busId: bus._id.toString(),
        stopId: stop._id.toString(),
        timestamp: new Date().toISOString()
      }
    };

    return await sendPushNotification(parent.parent.pushToken, message);
  } catch (error) {
    console.error('Error sending arrival notification:', error);
    return false;
  }
};

// Send emergency notification to school admin
const sendEmergencyNotification = async (schoolAdmin, bus, message) => {
  try {
    if (!schoolAdmin.pushToken) {
      return false;
    }

    const notificationMessage = {
      title: 'Bus Emergency Alert',
      body: `Emergency alert for Bus ${bus.busNumber}: ${message}`,
      data: {
        type: 'emergency_alert',
        busId: bus._id.toString(),
        message,
        timestamp: new Date().toISOString()
      }
    };

    return await sendPushNotification(schoolAdmin.pushToken, notificationMessage);
  } catch (error) {
    console.error('Error sending emergency notification:', error);
    return false;
  }
};

// Send delay notification to parents
const sendDelayNotification = async (parent, bus, stop, delayMinutes) => {
  try {
    if (!parent.parent.pushToken || !parent.parent.notificationPreferences.etaNotifications) {
      return false;
    }

    const message = {
      title: 'Bus Delay',
      body: `Bus ${bus.busNumber} is delayed by ${delayMinutes} minutes at ${stop.name}`,
      data: {
        type: 'bus_delay',
        busId: bus._id.toString(),
        stopId: stop._id.toString(),
        delayMinutes,
        timestamp: new Date().toISOString()
      }
    };

    return await sendPushNotification(parent.parent.pushToken, message);
  } catch (error) {
    console.error('Error sending delay notification:', error);
    return false;
  }
};

// Send route change notification
const sendRouteChangeNotification = async (parent, bus, oldRoute, newRoute) => {
  try {
    if (!parent.parent.pushToken) {
      return false;
    }

    const message = {
      title: 'Route Change',
      body: `Bus ${bus.busNumber} route has been updated`,
      data: {
        type: 'route_change',
        busId: bus._id.toString(),
        oldRouteId: oldRoute._id.toString(),
        newRouteId: newRoute._id.toString(),
        timestamp: new Date().toISOString()
      }
    };

    return await sendPushNotification(parent.parent.pushToken, message);
  } catch (error) {
    console.error('Error sending route change notification:', error);
    return false;
  }
};

module.exports = {
  sendPushNotification,
  sendPushNotifications,
  sendETANotification,
  sendArrivalNotification,
  sendEmergencyNotification,
  sendDelayNotification,
  sendRouteChangeNotification
}; 