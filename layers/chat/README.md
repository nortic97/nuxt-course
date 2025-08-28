# Chat Layer

## Description

The `chat` layer is the core of the application's interactive features. It provides the complete functionality for real-time conversations between users and AI agents. This includes managing chat history, sending and receiving messages, rendering formatted responses, and integrating with AI services for intelligent replies.

## Key Components

- `app/`
  - `components/`: Contains all UI components related to the chat interface, such as `ChatWindow.vue`, `ChatInput.vue`, and `MarkdownRenderer.vue`.
  - `composables/`: Reusable Vue composables like `useChats.ts` for managing chat state and API interactions.
  - `pages/chats/`: Dynamic pages for displaying individual chats, like `[id].vue`.

- `server/`
  - `api/chats/`: The backend API for all chat-related operations (CRUD for chats and messages).
  - `api/chats/[id]/generate-title.post.ts`: Endpoint for generating chat titles with an AI service.
  - `services/`: Business logic for interacting with AI models (`agent-service.ts`, `ai-service.ts`).

- `shared/`: Contains TypeScript types and interfaces (`types.ts`) shared between the frontend and backend of this layer, ensuring data consistency.

## Configuration

This layer extends `base` and `auth`. It is highly dependent on the authentication context to associate chats with users. It also requires specific environment variables for connecting to AI services (like OpenAI, Groq, or Ollama).

Key features implemented:
- **Reactive Chat Loading**: Messages are loaded and displayed reactively.
- **Markdown & Code Highlighting**: AI responses are rendered with proper formatting using `marked` and `highlight.js`.
- **AI Title Generation**: Chat titles are automatically generated based on the conversation's context.
