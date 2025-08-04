const cron = require('node-cron');
const Bus = require('../models/Bus');
const User = require('../models/User');
const { sendPushNotification } = require('./notificationService');

const initializeCronJobs = () => {
  console.log('Initializing cron jobs...');

  // Clean up old location logs (daily at 2 AM)
  cron.schedule('0 2 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const LocationLog = require('../models/LocationLog');
      const result = await LocationLog.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });

      console.log(`Cleaned up ${result.deletedCount} old location logs`);
    } catch (error) {
      console.error('Error cleaning up location logs:', error);
    }
  });

  // Check for inactive buses and notify school admins (every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      const inactiveBuses = await Bus.find({
        status: 'active',
        lastLocationUpdate: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes
      }).populate('school');

      for (const bus of inactiveBuses) {
        // Find school admin
        const schoolAdmin = await User.findOne({
          role: 'school',
          school: bus.school._id
        });

        if (schoolAdmin && schoolAdmin.pushToken) {
          await sendPushNotification(schoolAdmin.pushToken, {
            title: 'Bus Inactivity Alert',
            body: `Bus ${bus.busNumber} has been inactive for more than 30 minutes`,
            data: {
              type: 'bus_inactivity',
              busId: bus._id.toString(),
              busNumber: bus.busNumber
            }
          });
        }
      }

      if (inactiveBuses.length > 0) {
        console.log(`Sent inactivity alerts for ${inactiveBuses.length} buses`);
      }
    } catch (error) {
      console.error('Error checking bus inactivity:', error);
    }
  });

  // Daily route performance report (daily at 6 AM)
  cron.schedule('0 6 * * *', async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const ArrivalLog = require('../models/LocationLog').ArrivalLog;
      const arrivalStats = await ArrivalLog.aggregate([
        {
          $match: {
            actualTime: { $gte: yesterday, $lt: today }
          }
        },
        {
          $group: {
            _id: '$route',
            totalArrivals: { $sum: 1 },
            onTimeArrivals: {
              $sum: {
                $cond: [{ $eq: ['$status', 'on_time'] }, 1, 0]
              }
            },
            lateArrivals: {
              $sum: {
                $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
              }
            }
          }
        }
      ]);

      // Send report to school admins
      const schools = await User.find({ role: 'school' });
      
      for (const admin of schools) {
        if (admin.pushToken) {
          await sendPushNotification(admin.pushToken, {
            title: 'Daily Route Report',
            body: `Yesterday's performance: ${arrivalStats.length} routes completed`,
            data: {
              type: 'daily_report',
              date: yesterday.toISOString().split('T')[0],
              stats: arrivalStats
            }
          });
        }
      }

      console.log('Sent daily route performance reports');
    } catch (error) {
      console.error('Error generating daily report:', error);
    }
  });

  // Weekly maintenance reminder (every Monday at 8 AM)
  cron.schedule('0 8 * * 1', async () => {
    try {
      const buses = await Bus.find({ isActive: true }).populate('school');

      for (const bus of buses) {
        // Find school admin
        const schoolAdmin = await User.findOne({
          role: 'school',
          school: bus.school._id
        });

        if (schoolAdmin && schoolAdmin.pushToken) {
          await sendPushNotification(schoolAdmin.pushToken, {
            title: 'Weekly Maintenance Reminder',
            body: `Please check maintenance status for Bus ${bus.busNumber}`,
            data: {
              type: 'maintenance_reminder',
              busId: bus._id.toString(),
              busNumber: bus.busNumber
            }
          });
        }
      }

      console.log('Sent weekly maintenance reminders');
    } catch (error) {
      console.error('Error sending maintenance reminders:', error);
    }
  });

  // Check for buses that should be starting routes (every 15 minutes during school hours)
  cron.schedule('*/15 6-18 * * 1-5', async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Only run during school hours (6 AM to 6 PM, weekdays)
      if (currentHour >= 6 && currentHour < 18) {
        const buses = await Bus.find({
          isActive: true,
          status: 'inactive'
        }).populate('route');

        for (const bus of buses) {
          if (bus.route) {
            const schedule = bus.route.schedule;
            const morningStart = schedule.morning.startTime;
            const afternoonStart = schedule.afternoon.startTime;

            const [morningHour, morningMin] = morningStart.split(':').map(Number);
            const [afternoonHour, afternoonMin] = afternoonStart.split(':').map(Number);

            // Check if it's time to start morning route
            if (currentHour === morningHour && Math.abs(currentMinute - morningMin) <= 5) {
              // Notify driver
              const driver = await User.findById(bus.driver);
              if (driver && driver.pushToken) {
                await sendPushNotification(driver.pushToken, {
                  title: 'Route Starting',
                  body: `Time to start your morning route for Bus ${bus.busNumber}`,
                  data: {
                    type: 'route_start',
                    busId: bus._id.toString(),
                    routeId: bus.route._id.toString(),
                    direction: 'to_school'
                  }
                });
              }
            }

            // Check if it's time to start afternoon route
            if (currentHour === afternoonHour && Math.abs(currentMinute - afternoonMin) <= 5) {
              // Notify driver
              const driver = await User.findById(bus.driver);
              if (driver && driver.pushToken) {
                await sendPushNotification(driver.pushToken, {
                  title: 'Route Starting',
                  body: `Time to start your afternoon route for Bus ${bus.busNumber}`,
                  data: {
                    type: 'route_start',
                    busId: bus._id.toString(),
                    routeId: bus.route._id.toString(),
                    direction: 'from_school'
                  }
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking route start times:', error);
    }
  });

  console.log('Cron jobs initialized successfully');
};

module.exports = { initializeCronJobs }; 