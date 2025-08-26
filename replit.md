# Instant Plumber Connect - Geo-Located Video Chat Web App

## Overview

Instant Plumber Connect is a full-stack web application that connects customers with local plumbers through video chat. The application provides instant access for customers to find nearby plumbers without mandatory registration, while offering a comprehensive dashboard for plumbers to manage their availability and handle incoming calls. The system uses geolocation to match customers with available plumbers in their area and provides real-time video communication capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React.js with TypeScript using Vite for fast development and building
- **Styling**: Tailwind CSS with shadcn/ui components for a modern, consistent design system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context API with custom hooks for authentication and application state
- **Data Fetching**: TanStack React Query for server state management and caching
- **UI Components**: Comprehensive component library built on Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Authentication**: Passport.js with local strategy using scrypt for password hashing
- **Session Management**: Express-session with configurable storage (memory store for development)
- **API Design**: RESTful endpoints for plumber management, availability toggling, and call handling
- **Error Handling**: Centralized error middleware with consistent JSON responses

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon Database serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Data Models**: Plumbers table with profile information, availability status, and service radius; Calls table for tracking customer interactions

### Real-Time Communication
- **Video Chat**: WebRTC implementation for peer-to-peer video and audio communication
- **Push Notifications**: Web push notifications to alert available plumbers of incoming calls
- **Geolocation**: Browser geolocation API to find nearby plumbers within service radius

### Development Workflow
- **Build System**: Vite for frontend bundling with HMR, esbuild for server-side bundling
- **Development Server**: Express server with Vite middleware integration
- **Type Safety**: Full TypeScript coverage across frontend, backend, and shared schemas
- **Code Organization**: Modular architecture with shared schemas between client and server

### Security Considerations
- **Authentication**: Secure password hashing with salt using Node.js crypto module
- **Session Security**: Configurable session settings with secure cookies for production
- **Input Validation**: Zod schemas for runtime type checking and validation
- **CORS**: Proper cross-origin resource sharing configuration

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **PostgreSQL**: Primary database system for persistent data storage

### Authentication & Security
- **Passport.js**: Authentication middleware with local strategy support
- **connect-pg-simple**: PostgreSQL session store for production environments

### UI & Styling
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Drizzle Kit**: Database migration and introspection tools
- **TypeScript**: Static type checking for enhanced developer experience
- **Vite**: Frontend build tool with fast HMR and modern bundling

### Communication & Real-Time Features
- **WebRTC**: Browser API for peer-to-peer video/audio communication
- **Geolocation API**: Browser API for location-based plumber matching
- **Web Push API**: Browser notifications for incoming call alerts

### Production Deployment
- **Express Session Store**: Configurable session persistence (memory for dev, PostgreSQL for production)
- **Environment Configuration**: Flexible configuration for development and production environments