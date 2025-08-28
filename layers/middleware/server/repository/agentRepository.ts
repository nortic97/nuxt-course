import { firestoreClient } from '../utils/firebase.client'
import {
    createDocument,
    updateDocument,
    softDeleteDocument,
    getDocumentById,
    getPaginatedDocuments,
    searchDocuments,
    validateRequiredFields,
    queryToArray
} from '../utils/firestore.helpers'
import { isAgentCategoryActive } from './agentCategoryRepository'
import type {
    Agent,
    AgentWithCategory,
    AgentCategory,
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentQueryParams
} from '../types/types'

const COLLECTION_NAME = 'agents'

// Get all agents with pagination and filters
export async function getAllAgents(params: AgentQueryParams = {}): Promise<{
    documents: AgentWithCategory[]
    total: number
    hasNext: boolean
    hasPrev: boolean
}> {
    const {
        page = 1,
        limit = 10,
        orderBy = 'createdAt',
        orderDirection = 'desc',
        categoryId,
        isActive,
        search,
        minPrice,
        maxPrice
    } = params

    const whereConditions: Array<{
        field: string
        operator: FirebaseFirestore.WhereFilterOp
        value: unknown
    }> = []

    // Filters
    if (categoryId) {
        whereConditions.push({ field: 'categoryId', operator: '==', value: categoryId })
    }
    if (isActive !== undefined) {
        whereConditions.push({ field: 'isActive', operator: '==', value: isActive })
    }
    if (minPrice !== undefined) {
        whereConditions.push({ field: 'price', operator: '>=', value: minPrice })
    }
    if (maxPrice !== undefined) {
        whereConditions.push({ field: 'price', operator: '<=', value: maxPrice })
    }

    // If there is a search term, use the search function
    if (search && typeof search === 'string') {
        const searchResult = await searchAgents(search, { categoryId, isActive, minPrice, maxPrice })
        // To maintain consistency with pagination, we add hasNext and hasPrev
        return {
            ...searchResult,
            hasNext: false, // Search does not handle pagination
            hasPrev: false
        }
    }

    // Get paginated agents
    const result = await getPaginatedDocuments<Agent>(COLLECTION_NAME, {
        page,
        limit,
        orderBy,
        orderDirection,
        where: whereConditions
    })

    // Populate categories for each agent
    const agentsWithCategories: AgentWithCategory[] = []

    for (const agent of result.documents) {
        const category = await getDocumentById<AgentCategory>('agentCategories', agent.categoryId)
        if (category) {
            agentsWithCategories.push({
                ...agent,
                category
            })
        }
    }

    return {
        documents: agentsWithCategories,
        total: result.total,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
    }
}

// Get agent by ID with category
export async function getAgentById(id: string): Promise<AgentWithCategory | null> {
    const agent = await getDocumentById<Agent>(COLLECTION_NAME, id)
    if (!agent) return null

    // Get the category
    const category = await getDocumentById<AgentCategory>('agentCategories', agent.categoryId)
    if (!category) return null

    return {
        ...agent,
        category
    }
}

// Create a new agent
export async function createAgent(data: CreateAgentRequest): Promise<AgentWithCategory> {
    // Validate required fields
    const validation = validateRequiredFields(data, ['name', 'price', 'categoryId'])
    if (!validation.isValid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
    }

    // Validate that the price is valid
    if (data.price < 0) {
        throw new Error('Price cannot be negative')
    }

    // Check if the category exists and is active
    const categoryExists = await isAgentCategoryActive(data.categoryId)
    if (!categoryExists) {
        throw new Error('The specified category does not exist or is not active')
    }

    // Check that another agent with the same name does not exist in the same category
    const existingAgents = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('name', '==', data.name)
        .where('categoryId', '==', data.categoryId)
        .where('isActive', '==', true)
        .get()

    if (!existingAgents.empty) {
        throw new Error('An agent with that name already exists in this category')
    }

    // Create the agent
    const agentData = {
        ...data,
        isActive: true
    }

    const newAgent = await createDocument<Agent>(COLLECTION_NAME, agentData)

    // Get the category to return the complete agent
    const category = await getDocumentById<AgentCategory>('agentCategories', newAgent.categoryId)

    return {
        ...newAgent,
        category: category!
    }
}

// Update an agent
export async function updateAgent(
    id: string,
    data: UpdateAgentRequest
): Promise<AgentWithCategory | null> {
    // Check if the agent exists
    const existingAgent = await getDocumentById<Agent>(COLLECTION_NAME, id)
    if (!existingAgent) {
        throw new Error('Agent not found')
    }

    // Validate price if it is being updated
    if (data.price !== undefined && data.price < 0) {
        throw new Error('Price cannot be negative')
    }

    // Check category if it is being updated
    if (data.categoryId && data.categoryId !== existingAgent.categoryId) {
        const categoryExists = await isAgentCategoryActive(data.categoryId)
        if (!categoryExists) {
            throw new Error('The specified category does not exist or is not active')
        }
    }

    // Check for unique name in category if it is being updated
    if (data.name && data.name !== existingAgent.name) {
        const categoryId = data.categoryId || existingAgent.categoryId
        const existingAgents = await firestoreClient
            .collection(COLLECTION_NAME)
            .where('name', '==', data.name)
            .where('categoryId', '==', categoryId)
            .where('isActive', '==', true)
            .get()

        if (!existingAgents.empty) {
            const duplicateAgent = existingAgents.docs[0]
            if (duplicateAgent && duplicateAgent.id !== id) {
                throw new Error('An agent with that name already exists in this category')
            }
        }
    }

    const updatedAgent = await updateDocument<Agent>(COLLECTION_NAME, id, data)
    if (!updatedAgent) return null

    // Get the category
    const category = await getDocumentById<AgentCategory>('agentCategories', updatedAgent.categoryId)

    return {
        ...updatedAgent,
        category: category!
    }
}

// Delete an agent (soft delete)
export async function deleteAgent(id: string): Promise<void> {
    // Check if the agent exists
    const existingAgent = await getDocumentById<Agent>(COLLECTION_NAME, id)
    if (!existingAgent) {
        throw new Error('Agent not found')
    }

    // Check that it does not have active chats
    const activeChats = await firestoreClient
        .collection('chats')
        .where('agentId', '==', id)
        .where('isActive', '==', true)
        .get()

    if (!activeChats.empty) {
        throw new Error('Cannot delete an agent that has active chats')
    }

    await softDeleteDocument(COLLECTION_NAME, id)
}

// Search agents by text
export async function searchAgents(
    searchTerm: string,
    filters: {
        categoryId?: string
        isActive?: boolean
        minPrice?: number
        maxPrice?: number
    } = {}
): Promise<{ documents: AgentWithCategory[], total: number }> {
    const whereConditions: Array<{
        field: string
        operator: FirebaseFirestore.WhereFilterOp
        value: unknown
    }> = []

    // Apply additional filters
    if (filters.categoryId) {
        whereConditions.push({ field: 'categoryId', operator: '==', value: filters.categoryId })
    }
    if (filters.isActive !== undefined) {
        whereConditions.push({ field: 'isActive', operator: '==', value: filters.isActive })
    }
    if (filters.minPrice !== undefined) {
        whereConditions.push({ field: 'price', operator: '>=', value: filters.minPrice })
    }
    if (filters.maxPrice !== undefined) {
        whereConditions.push({ field: 'price', operator: '<=', value: filters.maxPrice })
    }

    const agents = await searchDocuments<Agent>(
        COLLECTION_NAME,
        'name',
        searchTerm,
        {
            where: whereConditions,
            orderBy: 'name',
            orderDirection: 'asc'
        }
    )

    // Get categories for each agent
    const agentsWithCategories: AgentWithCategory[] = []

    for (const agent of agents) {
        const category = await getDocumentById<AgentCategory>('agentCategories', agent.categoryId)
        if (category) {
            agentsWithCategories.push({
                ...agent,
                category
            })
        }
    }

    return {
        documents: agentsWithCategories,
        total: agentsWithCategories.length
    }
}

// Get agents by category
export async function getAgentsByCategory(categoryId: string): Promise<AgentWithCategory[]> {
    const querySnapshot = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('categoryId', '==', categoryId)
        .where('isActive', '==', true)
        .orderBy('name', 'asc')
        .get()

    const agents = queryToArray<Agent>(querySnapshot)
    const category = await getDocumentById<AgentCategory>('agentCategories', categoryId)

    if (!category) return []

    return agents.map(agent => ({
        ...agent,
        category
    }))
}

// Check if a user can use an agent
export async function checkUserCanUseAgent(userId: string, agentId: string): Promise<boolean> {
    const userAgentQuery = await firestoreClient
        .collection('userAgents')
        .where('userId', '==', userId)
        .where('agentId', '==', agentId)
        .where('isActive', '==', true)
        .get()

    if (userAgentQuery.empty) return false

    const firstDoc = userAgentQuery.docs[0]
    if (!firstDoc) return false

    const userAgent = firstDoc.data()

    // Check if it has not expired
    if (userAgent.expiresAt && userAgent.expiresAt.toDate() < new Date()) {
        return false
    }

    return true
}

// Get available agents for a user
export async function getAvailableAgentsForUser(userId: string): Promise<AgentWithCategory[]> {
    // Get the agents that the user has paid for
    const userAgentsQuery = await firestoreClient
        .collection('userAgents')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get()

    if (userAgentsQuery.empty) return []

    const agentIds = userAgentsQuery.docs
        .map(doc => doc.data())
        .filter(userAgent => !userAgent.expiresAt || userAgent.expiresAt.toDate() > new Date())
        .map(userAgent => userAgent.agentId)

    if (agentIds.length === 0) return []

    // Get the agents
    const agentsWithCategories: AgentWithCategory[] = []

    for (const agentId of agentIds) {
        const agent = await getAgentById(agentId)
        if (agent && agent.isActive) {
            agentsWithCategories.push(agent)
        }
    }

    return agentsWithCategories.sort((a, b) => a.name.localeCompare(b.name))
}
