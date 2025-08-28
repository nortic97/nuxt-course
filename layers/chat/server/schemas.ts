import { z } from 'zod'

// Message role enum and type definition
const MessageRole = z.enum(['user', 'assistant'])

// Base message schema
export const MessageSchema = z
  .object({
    content: z.string(),
    role: MessageRole,
    id: z.string().uuid().optional(),
    chatId: z.string().uuid().optional(),
  })
  .strict()

// Chat and message related schemas
export const ChatMessageSchema = z
  .object({
    messages: z.array(MessageSchema),
    chatId: z.string().uuid(),
  })
  .strict()

export const CreateMessageSchema = z
  .object({
    content: z.string().min(1),
    role: MessageRole,
  })
  .strict()

// Chat related schemas
export const CreateChatSchema = z
  .object({
    title: z.string().min(1).optional(),
  })
  .strict()

export const UpdateChatTitleSchema = z
  .object({
    message: z.string().min(1),
  })
  .strict()
