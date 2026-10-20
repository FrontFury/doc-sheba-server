# DocSheba Server 🏥⚡

**DocSheba Server** is the backend RESTful API service powering the DocSheba healthcare platform. Built using **Node.js**, **Express.js**, and **MongoDB**, it handles user authentication, doctor appointments, patient medical records, schedule management, payment processing, and notification services.

---

## 🛠️ Tech Stack

- **Runtime Environment:** [Node.js](https://nodejs.org/)
- **Framework:** [Express.js](https://expressjs.com/)
- **Database:** [MongoDB](https://www.mongodb.com/) (with [Mongoose](https://mongoosejs.com/) ORM)
- **Authentication:** JSON Web Tokens (JWT) & bcrypt.js
- **Validation:** Zod / Joi
- **Payment Gateway Integration:** SSLCommerz / Stripe / bKash
- **Environment Management:** `dotenv`

---

## ✨ Features

- **User Role Management:**
  - **Patient:** Book appointments, view medical history, search doctors, manage profile.
  - **Doctor:** Manage availability slots, view patient bookings, issue prescriptions.
  - **Admin:** Manage users, verify doctor profiles, monitor platform analytics, handle payments.
- **Appointment Scheduling:** Real-time booking system with slot lock and status updates.
- **Secure Authentication:** JWT-based stateless authentication with password hashing.
- **Payment Processing:** Integrated online payment gateways with transaction history.
- **File Storage:** Profile image and prescription upload handling via Cloudinary / AWS S3.

---

## 📁 Project Structure

```text
docsheba-server/
├── config/             # Database and third-party configuration files
│   └── db.js
├── controllers/        # Request handlers & business logic
│   ├── authController.js
│   ├── doctorController.js
│   ├── patientController.js
│   └── appointmentController.js
├── middlewares/        # Custom middlewares (Auth, Error handling, Uploads)
│   ├── authMiddleware.js
│   └── errorMiddleware.js
├── models/             # Mongoose schemas & data models
│   ├── User.js
│   ├── Doctor.js
│   ├── Appointment.js
│   └── MedicalRecord.js
├── routes/             # API routes definition
│   ├── authRoutes.js
│   ├── doctorRoutes.js
│   └── appointmentRoutes.js
├── utils/              # Helper functions & utilities
├── .env.example        # Environment variable template
├── .gitignore
├── index.js            # Main entry point
└── package.json
```

---

## 🚀 Getting Started

Follow these steps to set up and run the server locally.

### Prerequisites

Ensure you have the following installed on your local development machine:
- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**
- **MongoDB** (Local instance or MongoDB Atlas URI)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/docsheba-server.git
   cd docsheba-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Fill in your configuration credentials inside `.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_DB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/docsheba?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=7d
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

   For Vercel, add `MONGO_DB_URI` in **Project Settings → Environment Variables** for the environments you deploy to. The server also accepts `MONGO_URI` for existing deployments.

4. **Run the Application:**

   - **Development Mode (with auto-reload):**
     ```bash
     npm run dev
     ```
   - **Production Mode:**
     ```bash
     npm start
     ```

   The server should now be running on `http://localhost:5000`.

---

## 📡 API Endpoint Overview

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register a new user (Patient/Doctor) | Public |
| `POST` | `/login` | User login & token generation | Public |
| `GET` | `/me` | Get current logged-in user profile | Private |

### 🩺 Doctors (`/api/v1/doctors`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Fetch list of all approved doctors | Public |
| `GET` | `/:id` | Get single doctor details | Public |
| `PATCH` | `/:id/availability` | Update available consultation slots | Doctor |

### 📅 Appointments (`/api/v1/appointments`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/book` | Book a new doctor appointment | Patient |
| `GET` | `/my-appointments` | Get appointments for logged-in user | Private |
| `PATCH` | `/:id/status` | Update appointment status (Cancel/Complete) | Doctor/Admin |

---

## 🧪 Running Tests

To run test suites (using Jest / Supertest if configured):
```bash
npm test
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git checkout origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
