# School Bus Tracker

A comprehensive cross-platform mobile application for real-time school bus tracking with role-based access for schools, drivers, and parents.

## 🚌 Features

### For School Administrators
- **Dashboard**: Overview of all buses, routes, and users
- **Bus Management**: Add, edit, and manage bus fleet
- **Route Management**: Create and configure bus routes with stops
- **User Management**: Register and manage drivers and parents
- **Real-time Monitoring**: Track all buses in real-time
- **Analytics**: View bus performance and arrival logs

### For Bus Drivers
- **Location Sharing**: Automatic location updates every 3 minutes
- **Next Stop Display**: See upcoming stops and directions
- **Route Navigation**: View assigned route and current position
- **Status Updates**: Mark arrivals and update bus status
- **Emergency Alerts**: Quick access to emergency contacts

### For Parents
- **Real-time ETA**: Get accurate arrival times with traffic consideration
- **Push Notifications**: 10-minute advance arrival alerts
- **Live Map**: Track bus location in real-time
- **Stop Selection**: Choose preferred bus stop for notifications
- **Multiple Children**: Manage multiple children on different routes

## 🛠 Technology Stack

### Frontend (Mobile App)
- **React Native** with Expo
- **React Navigation** for navigation
- **React Native Paper** for UI components
- **React Native Maps** for map integration
- **Socket.IO Client** for real-time communication
- **Expo Location** for GPS tracking
- **Expo Notifications** for push notifications

### Backend (API Server)
- **Node.js** with Express
- **MongoDB** with Mongoose
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Google Maps API** for traffic integration
- **Expo Push Notifications** for push services

## 📱 Screenshots

*Screenshots will be added here*

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Expo CLI
- Google Maps API Key (optional, for traffic features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd school-bus-tracker
   ```

2. **Install dependencies**
   ```bash
   # Install mobile app dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Environment Setup**
   
   Create `.env` file in the backend directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/school-bus-tracker
   JWT_SECRET=your-super-secret-jwt-key
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```

5. **Start the mobile app**
   ```bash
   npm start
   ```

6. **Run on device/simulator**
   - Install Expo Go on your device
   - Scan the QR code from the terminal
   - Or press 'i' for iOS simulator or 'a' for Android emulator

## 📋 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register/school` - Register school admin
- `POST /api/auth/register/driver` - Register driver (admin only)
- `POST /api/auth/register/parent` - Register parent (admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Bus Management
- `GET /api/bus` - Get all buses
- `POST /api/bus` - Create new bus
- `GET /api/bus/:id` - Get bus details
- `PUT /api/bus/:id` - Update bus
- `DELETE /api/bus/:id` - Delete bus

### Route Management
- `GET /api/route` - Get all routes
- `POST /api/route` - Create new route
- `GET /api/route/:id` - Get route details
- `PUT /api/route/:id` - Update route
- `DELETE /api/route/:id` - Delete route

### Location Tracking
- `POST /api/location/update` - Update bus location (driver only)
- `GET /api/location/bus/:busId` - Get bus location
- `GET /api/location/eta/:busId/:stopIndex` - Get ETA to stop
- `GET /api/location/history/:busId` - Get location history

### Real-time Events (Socket.IO)
- `location_update` - Bus location updates
- `bus_status_update` - Bus status changes
- `bus_approaching_stop` - Bus approaching stop
- `bus_arrived_at_stop` - Bus arrived at stop
- `eta_response` - ETA calculation response

## 🔧 Configuration

### Google Maps Integration
1. Get a Google Maps API key from Google Cloud Console
2. Enable the following APIs:
   - Maps JavaScript API
   - Directions API
   - Geocoding API
3. Add the API key to your `.env` file

### Push Notifications
1. Configure Expo push notifications in your Expo dashboard
2. Update the push notification settings in `app.json`

### Database Configuration
1. Set up MongoDB instance
2. Update `MONGODB_URI` in `.env`
3. Create indexes for optimal performance:
   ```javascript
   // Location logs index
   db.locationlogs.createIndex({ location: "2dsphere" })
   db.locationlogs.createIndex({ bus: 1, timestamp: -1 })
   
   // Bus index
   db.buses.createIndex({ currentLocation: "2dsphere" })
   db.buses.createIndex({ school: 1, status: 1 })
   ```

## 🏗 Project Structure

```
school-bus-tracker/
├── App.js                          # Main app component
├── app.json                        # Expo configuration
├── package.json                    # Mobile app dependencies
├── src/
│   ├── components/                 # Reusable components
│   ├── screens/                    # App screens
│   ├── context/                    # React contexts
│   ├── config/                     # Configuration files
│   ├── theme/                      # UI theme and styles
│   ├── utils/                      # Utility functions
│   └── services/                   # API services
├── backend/
│   ├── server.js                   # Express server
│   ├── package.json                # Backend dependencies
│   ├── models/                     # MongoDB models
│   ├── routes/                     # API routes
│   ├── middleware/                 # Express middleware
│   ├── services/                   # Business logic
│   ├── socket/                     # Socket.IO handlers
│   └── utils/                      # Backend utilities
└── assets/                         # Images and static files
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Different permissions for each user type
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Configuration**: Proper CORS setup for security

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  role: String (school|driver|parent),
  firstName: String,
  lastName: String,
  school: ObjectId (ref: School),
  driver: {
    bus: ObjectId (ref: Bus),
    licenseNumber: String,
    isActive: Boolean
  },
  parent: {
    children: Array,
    selectedStop: ObjectId,
    pushToken: String,
    notificationPreferences: Object
  }
}
```

### Buses Collection
```javascript
{
  _id: ObjectId,
  busNumber: String,
  school: ObjectId (ref: School),
  driver: ObjectId (ref: User),
  route: ObjectId (ref: Route),
  currentLocation: {
    type: String,
    coordinates: [Number, Number]
  },
  status: String (active|inactive|maintenance|offline),
  currentDirection: String (to_school|from_school),
  currentStopIndex: Number
}
```

### Routes Collection
```javascript
{
  _id: ObjectId,
  name: String,
  school: ObjectId (ref: School),
  stops: [{
    name: String,
    location: {
      type: String,
      coordinates: [Number, Number]
    },
    address: Object,
    estimatedTime: Number,
    stopOrder: Number
  }],
  direction: String (to_school|from_school|both)
}
```

## 🚀 Deployment

### Backend Deployment
1. Set up a MongoDB Atlas cluster
2. Deploy to Heroku, AWS, or your preferred platform
3. Set environment variables
4. Configure domain and SSL

### Mobile App Deployment
1. Build the app using Expo:
   ```bash
   expo build:android
   expo build:ios
   ```
2. Submit to App Store and Google Play Store
3. Configure production API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core features
- Real-time bus tracking
- Role-based authentication
- Push notifications
- Route management
- ETA calculations

## 🎯 Roadmap

- [ ] Offline mode support
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Integration with school management systems
- [ ] Weather-based route optimization
- [ ] Parent communication features
- [ ] Driver performance metrics
- [ ] Mobile app for web browsers 