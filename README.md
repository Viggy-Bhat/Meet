# Meet - Scheduling Platform

![Project Banner](public/banner.png) **Meet** is a modern, full-stack scheduling application inspired by Calendly. It simplifies appointment booking by allowing users to define their availability, create custom event types, and share personalized booking links.

The application seamlessly integrates with **Google Calendar** to prevent double-booking and automatically syncs scheduled events.

## 🚀 Live Demo

[**View Live Demo**](https://meet-wh2i.vercel.app/)
*(Replace with your actual Vercel link)*

## ✨ Key Features

-   **Authentication & User Management**: Secure login via Clerk (Google, Email).
-   **Google Calendar Integration**:
    -   Two-way sync: Reads user availability and writes new events directly to their calendar.
    -   Handles OAuth consents and token management.
-   **Dashboard**: Real-time overview of upcoming meetings and event types.
-   **Availability Management**: Users can define specific working hours and days.
-   **Custom Booking Pages**: Unique public URLs for users to share.
-   **Responsive Design**: Optimized for mobile and desktop using Tailwind CSS.
-   **Fast Performance**: Built on Next.js 16 using Server Actions and Server Components.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: JavaScript / React
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [ShadCN UI](https://ui.shadcn.com/)
-   **Database**: PostgreSQL (via [Supabase](https://supabase.com/) or similar)
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Auth**: [Clerk](https://clerk.com/)
-   **Validation**: Zod & React Hook Form
-   **Deployment**: [Vercel](https://vercel.com/)

## ⚙️ Environment Variables

To run this project locally, you will need to add the following environment variables to your `.env` file:

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

#Clone the repository 
git clone [https://github.com/Viggy-Bhat/Meet.git](https://github.com/Viggy-Bhat/Meet.git)
cd Meet
. Install dependencies
Bash
npm install

3. Set up the database
Ensure your PostgreSQL database is running and the .env file is configured.
Bash
npx prisma generate
npx prisma db push

4. Run the development server
Bash
npm run dev
Open http://localhost:3000 with your browser to see the result.
