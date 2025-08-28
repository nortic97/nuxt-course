// layers/base/server/repository/userAgentRepository.ts
import { firestoreClient } from '../utils/firebase.client'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type {
    UserAgent,
    CreateUserAgentInput,
    UpdateUserAgentInput,
    Agent
} from '../types/types'
import { validateId, generateId } from '../utils/firestore.helpers'

interface UserAgentAccessCheck {
    hasAccess: boolean
    reason?: string
}

/**
 * Checks if a user has access to a specific agent
 * @param userId User ID
 * @param agentId Agent ID
 * @returns Promise<UserAgentAccessCheck> Object with the verification result
 */
export async function checkUserAgentAccess(userId: string, agentId: string): Promise<UserAgentAccessCheck> {
    try {
        validateId(userId, 'User ID')
        validateId(agentId, 'Agent ID')

        const snapshot = await firestoreClient
            .collection('userAgents')
            .where('userId', '==', userId)
            .where('agentId', '==', agentId)
            .where('isActive', '==', true)
            .limit(1)
            .get()

        if (snapshot.empty) {
            return {
                hasAccess: false,
                reason: 'No active subscription found for this agent'
            }
        }

        const userAgent = snapshot.docs[0]?.data() as UserAgent

        // Check if the subscription has expired
        if (userAgent.expiresAt) {
            const expiresAt = userAgent.expiresAt instanceof Timestamp
                ? userAgent.expiresAt
                : Timestamp.fromDate(new Date(userAgent.expiresAt))

            if (expiresAt.toMillis() < Date.now()) {
                return {
                    hasAccess: false,
                    reason: 'The subscription for this agent has expired'
                }
            }
        }

        return {
            hasAccess: true
        }
    } catch (error) {
        console.error('Error checking agent access:', error)
        return {
            hasAccess: false,
            reason: 'Error checking agent access'
        }
    }
}

const COLLECTION_NAME = 'userAgents'

export async function createUserAgent(data: CreateUserAgentInput): Promise<UserAgent> {
    // Validate required fields
    if (!data.userId) throw new Error('userId is required')
    if (!data.agentId) throw new Error('agentId is required')

    // Validate UUIDs
    validateId(data.userId, 'User ID')
    validateId(data.agentId, 'Agent ID')

    const now = Timestamp.now()

    // Ensure all dates are Timestamps
    const purchasedAt = data.purchasedAt instanceof Timestamp
        ? data.purchasedAt
        : (data.purchasedAt ? Timestamp.fromDate(new Date(data.purchasedAt)) : now)

    const lastUsedAt = data.usage?.lastUsedAt instanceof Timestamp
        ? data.usage.lastUsedAt
        : (data.usage?.lastUsedAt ? Timestamp.fromDate(new Date(data.usage.lastUsedAt)) : now)

    const userAgent: UserAgent = {
        ...data,
        id: generateId(),
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
        purchasedAt,
        expiresAt: data.expiresAt ? (data.expiresAt instanceof Timestamp ? data.expiresAt : Timestamp.fromDate(new Date(data.expiresAt))) : undefined,
        paymentId: data.paymentId,
        usage: {
            messageCount: data.usage?.messageCount ?? 0,
            lastUsedAt
        }
    }

    await firestoreClient
        .collection(COLLECTION_NAME)
        .doc(userAgent.id)
        .set(userAgent)

    return userAgent
}

export async function getUserAgentById(id: string): Promise<UserAgent | null> {
    validateId(id, 'UserAgent ID')

    try {
        const doc = await firestoreClient
            .collection(COLLECTION_NAME)
            .doc(id)
            .get()

        if (!doc.exists) {
            return null
        }

        return { id: doc.id, ...doc.data() } as UserAgent
    } catch (error) {
        console.error('Error getting user agent by ID:', error)
        throw new Error('Error retrieving user agent')
    }
}

export async function getUserAgentByUserAndAgent(
    userId: string,
    agentId: string
): Promise<UserAgent | null> {
    validateId(userId, 'User ID')
    validateId(agentId, 'Agent ID')

    try {
        const snapshot = await firestoreClient
            .collection(COLLECTION_NAME)
            .where('userId', '==', userId)
            .where('agentId', '==', agentId)
            .limit(1)
            .get()

        if (snapshot.empty) {
            return null
        }

        const doc = snapshot.docs[0]
        if (!doc) {
            return null
        }
        return { id: doc.id, ...doc.data() } as UserAgent
    } catch (error) {
        console.error('Error getting user agent by user and agent:', error)
        throw new Error('Error retrieving user agent')
    }
}

interface GetUserAgentsOptions {
    activeOnly?: boolean
    includeAgentData?: boolean
    includeCategory?: boolean
}

interface AgentWithCategory extends Agent {
    category?: {
        id: string
        name: string
        description?: string
        icon?: string
    }
}

export async function getUserAgentsByUser(
    userId: string,
    options: GetUserAgentsOptions = {}
): Promise<Array<UserAgent & { agent?: AgentWithCategory }>> {
    validateId(userId, 'User ID')

    let query = firestoreClient
        .collection(COLLECTION_NAME)
        .where('userId', '==', userId)

    if (options.activeOnly) {
        query = query
            .where('isActive', '==', true)
            .where('expiresAt', '>', Timestamp.now())
    }

    const snapshot = await query.get()
    const userAgents = snapshot.docs.map(doc => doc.data() as UserAgent)

    // If requested, populate agent and category data
    if (options.includeAgentData) {
        const { getAgentById } = await import('./agentRepository')
        const { getAgentCategoryById } = await import('./agentCategoryRepository')

        const agents = await Promise.all(
            userAgents.map(async ua => {
                const agent = await getAgentById(ua.agentId)
                if (!agent) return { ...ua, agent: undefined }

                // If requested, include the agent's category
                if (options.includeCategory && agent.categoryId) {
                    const category = await getAgentCategoryById(agent.categoryId)
                    if (category) {
                        agent.category = category
                    }
                }

                return { ...ua, agent }
            })
        )
        return agents
    }

    return userAgents
}

export async function updateUserAgent(
    id: string,
    data: UpdateUserAgentInput
): Promise<UserAgent> {
    validateId(id, 'UserAgent ID')

    const updateData = {
        ...data,
        updatedAt: Timestamp.now()
    }

    await firestoreClient
        .collection(COLLECTION_NAME)
        .doc(id)
        .update(updateData)

    return getUserAgentById(id) as Promise<UserAgent>
}

export async function deactivateUserAgent(id: string): Promise<void> {
    validateId(id, 'UserAgent ID')

    try {
        await firestoreClient
            .collection(COLLECTION_NAME)
            .doc(id)
            .update({
                'subscription.status': 'cancelled',
                updatedAt: Timestamp.now()
            })
    } catch (error) {
        console.error('Error deactivating user agent:', error)
        throw new Error('Error deactivating user agent')
    }
}

export async function activateUserAgent(id: string): Promise<void> {
    validateId(id, 'UserAgent ID')

    try {
        await firestoreClient
            .collection(COLLECTION_NAME)
            .doc(id)
            .update({
                'subscription.status': 'active',
                updatedAt: Timestamp.now()
            })
    } catch (error) {
        console.error('Error activating user agent:', error)
        throw new Error('Error activating user agent')
    }
}

export async function updateUserAgentUsage(
    id: string,
    increment: number = 1
): Promise<void> {
    validateId(id, 'UserAgent ID')

    try {
        await firestoreClient
            .collection(COLLECTION_NAME)
            .doc(id)
            .update({
                'usage.messageCount': FieldValue.increment(increment),
                'usage.lastUsedAt': Timestamp.now(),
                updatedAt: Timestamp.now()
            })
    } catch (error) {
        console.error('Error updating user agent usage:', error)
        throw new Error('Error updating usage')
    }
}