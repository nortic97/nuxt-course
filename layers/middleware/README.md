# Middleware Layer

This layer provides the core infrastructure for the application, including Firebase/Firestore integration, logging utilities, and data repository patterns.

## Environment Variables

### Required Environment Variables

The following environment variables are required for the middleware layer to function properly:

#### Firebase Configuration
- **`NODE_ENV`** - Application environment (`development`, `production`, `test`)
  - Used by the logger to determine log levels
  - Default: `development`

#### Authentication (from auth layer)
- **`NUXT_SESSION_PASSWORD`** - Session encryption password (minimum 32 characters)
- **`NUXT_OAUTH_GOOGLE_CLIENT_ID`** - Google OAuth client ID
- **`NUXT_OAUTH_GOOGLE_CLIENT_SECRET`** - Google OAuth client secret

### Example .env file

```env
# Application Environment
NODE_ENV=development

# Session Configuration
NUXT_SESSION_PASSWORD=your-super-secure-password-with-at-least-32-characters

# Google OAuth Configuration
NUXT_OAUTH_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Firebase Configuration

### Firebase Service Account Key

The Firebase service account key must be placed at the following path:

```
layers/middleware/server/firebaseKey.json
```

#### Firebase Key Structure

Your `firebaseKey.json` file should contain the following structure:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project-id.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project-id.iam.gserviceaccount.com"
}
```

#### How to Obtain Firebase Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Navigate to the **Service Accounts** tab
5. Click **Generate new private key**
6. Download the JSON file and rename it to `firebaseKey.json`
7. Place it in `layers/middleware/server/firebaseKey.json`

**⚠️ Security Warning**: Never commit the `firebaseKey.json` file to version control. Add it to your `.gitignore` file.

## Features

### Firestore Integration

The middleware layer provides comprehensive Firestore integration through:

- **Firebase Client** (`server/utils/firebase.client.ts`) - Initializes Firebase Admin SDK
- **Firestore Helpers** (`server/utils/firestore.helpers.ts`) - Utility functions for CRUD operations

### Available Firestore Operations

- `createDocument()` - Create new documents
- `updateDocument()` - Update existing documents
- `getDocumentById()` - Retrieve documents by ID
- `deleteDocument()` - Permanently delete documents
- `softDeleteDocument()` - Soft delete (mark as inactive)
- `getPaginatedDocuments()` - Paginated document retrieval
- `searchDocuments()` - Text-based document search

### Logging System

The middleware includes a comprehensive logging system (`server/utils/logger.ts`) with:

- **Log Levels**: `debug`, `info`, `warn`, `error`
- **Environment-aware**: Different log levels for development vs production
- **Structured Logging**: JSON format with timestamps and context
- **Request Logging**: Automatic HTTP request logging

### Repository Pattern

The layer implements repository patterns for:

- User management (`server/repository/userRepository.ts`)
- Chat management (`server/repository/chatRepository.ts`)
- Message handling (`server/repository/messageRepository.ts`)
- Agent management (`server/repository/agentRepository.ts`)
- User-Agent relationships (`server/repository/userAgentRepository.ts`)
- Agent categories (`server/repository/agentCategoryRepository.ts`)

## API Endpoints

### User Agents
- `GET /api/user-agents/[userId]` - Retrieve user's agents

### Admin
- `POST /api/admin/migrate` - Database migration endpoint

## Development Setup

1. Ensure all environment variables are set in your `.env` file
2. Place your Firebase service account key at `layers/middleware/server/firebaseKey.json`
3. Install dependencies: `pnpm install`
4. Start development server: `pnpm dev`

## Security Considerations

- **Firebase Key**: Never expose your Firebase service account key
- **Environment Variables**: Use secure values for production
- **Logging**: Be careful not to log sensitive information
- **Session Password**: Use a strong, randomly generated password

## Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Verify `firebaseKey.json` is in the correct location
   - Check that the service account has proper permissions
   - Ensure project ID matches your Firebase project

2. **Authentication Issues**
   - Verify Google OAuth credentials are correct
   - Check that redirect URIs are configured in Google Console
   - Ensure session password is at least 32 characters

3. **Logging Issues**
   - Check `NODE_ENV` environment variable
   - Verify log level configuration

### Support

For additional support or questions about the middleware layer configuration, please refer to the project documentation or contact the development team.
