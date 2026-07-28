# RentMe - Student Housing Platform

RentMe is a web-based platform that connects students directly with room and flat owners across the Kathmandu Valley, eliminating broker fees and centralizing the search process.

## Features

- **Students**: Search rooms by budget, location, and type. View details, photos, and directly contact owners. Save favorite rooms.
- **Owners**: List rooms, manage availability, and reach students directly.
- **Admin**: Verify owner identities, moderate listings, and manage users.

## Technology Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT, bcrypt

## Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)

## Setup Instructions

1. **Clone the repository** (if applicable) and navigate to the root directory.
2. **Install dependencies**:
   \`\`\`bash
   npm run install:all
   \`\`\`
3. **Configure Environment Variables**:
   Create a \`.env\` file in the root directory and add the necessary variables (use \`.env.example\` as a guide).
   Ensure MongoDB is running locally or provide a valid connection string.
4. **Seed the Database** (Optional):
   Run the seed script to create sample users and listings:
   \`\`\`bash
   node server/utils/seed.js
   \`\`\`
5. **Run the Application**:
   Start both the frontend and backend servers concurrently:
   \`\`\`bash
   npm run dev
   \`\`\`
   - Frontend will be available at \`http://localhost:3000\`
   - Backend will be available at \`http://localhost:5000\`

## Default Test Accounts (if seeded)
- **Admin**: admin@rentme.com / admin123
- **Owner**: owner@rentme.com / owner123
- **Student**: student@rentme.com / student123
