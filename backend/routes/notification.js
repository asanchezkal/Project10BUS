const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendPushNotification } = require('../services/notificationService');

const router = express.Router();

// Register push token
router.post('/register-token', authenticateToken, [
  body('pushToken').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pushToken } = req.body;

    // Update user's push token
    const updateField = req.user.role === 'parent' ? 'parent.pushToken' : 'pushToken';
    
    await User.findByIdAndUpdate(req.user._id, {
      [updateField]: pushToken
    });

    res.json({ message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// Send test notification
router.post('/test', authenticateToken, requireRole(['school']), [
  body('message').notEmpty().trim(),
  body('recipients').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, recipients } = req.body;

    const notificationData = {
      title: 'Test Notification',
      body: message,
      data: {
        type: 'test_notification',
        timestamp: new Date().toISOString()
      }
    };

    let successCount = 0;
    let failureCount = 0;

    for (const recipientId of recipients) {
      try {
        const user = await User.findById(recipientId);
        if (!user) continue;

        const pushToken = req.user.role === 'parent' ? user.parent.pushToken : user.pushToken;
        
        if (pushToken) {
          const success = await sendPushNotification(pushToken, notificationData);
          if (success) {
            successCount++;
          } else {
            failureCount++;
          }
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`Failed to send notification to ${recipientId}:`, error);
        failureCount++;
      }
    }

    res.json({
      message: 'Test notifications sent',
      results: {
        success: successCount,
        failure: failureCount,
        total: recipients.length
      }
    });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Get notification settings
router.get('/settings', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('parent.notificationPreferences');
    
    res.json({
      settings: user.parent.notificationPreferences
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// Update notification settings
router.put('/settings', authenticateToken, requireRole(['parent']), [
  body('etaNotifications').optional().isBoolean(),
  body('arrivalNotifications').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { etaNotifications, arrivalNotifications } = req.body;
    const updates = {};

    if (etaNotifications !== undefined) {
      updates['parent.notificationPreferences.etaNotifications'] = etaNotifications;
    }
    if (arrivalNotifications !== undefined) {
      updates['parent.notificationPreferences.arrivalNotifications'] = arrivalNotifications;
    }

    await User.findByIdAndUpdate(req.user._id, updates);

    res.json({
      message: 'Notification settings updated successfully'
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Send emergency notification (school admin only)
router.post('/emergency', authenticateToken, requireRole(['school']), [
  body('message').notEmpty().trim(),
  body('busId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, busId } = req.body;

    let recipients = [];

    if (busId) {
      // Send to specific bus driver and parents of that route
      const Bus = require('../models/Bus');
      const Route = require('../models/Route');
      
      const bus = await Bus.findById(busId).populate('route');
      if (bus && bus.route) {
        // Get driver
        if (bus.driver) {
          const driver = await User.findById(bus.driver);
          if (driver && driver.pushToken) {
            recipients.push(driver.pushToken);
          }
        }

        // Get parents on this route
        const parents = await User.find({
          role: 'parent',
          school: req.user.school,
          'parent.selectedStop': { $in: bus.route.stops.map(stop => stop._id) }
        });

        parents.forEach(parent => {
          if (parent.parent.pushToken) {
            recipients.push(parent.parent.pushToken);
          }
        });
      }
    } else {
      // Send to all users in the school
      const users = await User.find({
        school: req.user.school,
        isActive: true
      });

      users.forEach(user => {
        const pushToken = user.role === 'parent' ? user.parent.pushToken : user.pushToken;
        if (pushToken) {
          recipients.push(pushToken);
        }
      });
    }

    const notificationData = {
      title: 'Emergency Alert',
      body: message,
      data: {
        type: 'emergency_alert',
        busId: busId || null,
        timestamp: new Date().toISOString()
      }
    };

    let successCount = 0;
    let failureCount = 0;

    for (const pushToken of recipients) {
      try {
        const success = await sendPushNotification(pushToken, notificationData);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error('Failed to send emergency notification:', error);
        failureCount++;
      }
    }

    res.json({
      message: 'Emergency notification sent',
      results: {
        success: successCount,
        failure: failureCount,
        total: recipients.length
      }
    });
  } catch (error) {
    console.error('Send emergency notification error:', error);
    res.status(500).json({ error: 'Failed to send emergency notification' });
  }
});

// Get notification history (for school admin)
router.get('/history', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    // This would typically come from a notification log collection
    // For now, return a placeholder response
    res.json({
      notifications: [],
      message: 'Notification history feature coming soon'
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({ error: 'Failed to get notification history' });
  }
});

module.exports = router; 