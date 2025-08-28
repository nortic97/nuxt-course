import { firestoreClient } from '../utils/firebase.client'
import {
    createDocument,
    updateDocument,
    softDeleteDocument,
    getDocumentById,
    getPaginatedDocuments,
    searchDocuments,
    validateRequiredFields
} from '../utils/firestore.helpers'
import type {
    AgentCategory,
    CreateAgentCategoryRequest,
    UpdateAgentCategoryRequest,
    PaginationParams
} from '../types/types'

const COLLECTION_NAME = 'agentCategories'

// Get all categories with pagination
export async function getAllAgentCategories(params: PaginationParams = {}) {
    const { page = 1, limit = 10, orderBy = 'name', orderDirection = 'asc' } = params

    return await getPaginatedDocuments<AgentCategory>(COLLECTION_NAME, {
        page,
        limit,
        orderBy,
        orderDirection,
        where: [
            { field: 'isActive', operator: '==', value: true }
        ]
    })
}

// Get category by ID
export async function getAgentCategoryById(id: string): Promise<AgentCategory | null> {
    return await getDocumentById<AgentCategory>(COLLECTION_NAME, id)
}

// Create a new category
export async function createAgentCategory(data: CreateAgentCategoryRequest): Promise<AgentCategory> {
    // Validate required fields
    const validation = validateRequiredFields(data, ['name'])
    if (!validation.isValid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
    }

    // Check if the name already exists
    const existingCategories = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('name', '==', data.name)
        .where('isActive', '==', true)
        .get()

    if (!existingCategories.empty) {
        throw new Error('A category with that name already exists')
    }

    // Create the category
    const categoryData = {
        ...data,
        isActive: true
    }

    return await createDocument<AgentCategory>(COLLECTION_NAME, categoryData as AgentCategory)
}

// Update a category
export async function updateAgentCategory(
    id: string,
    data: UpdateAgentCategoryRequest
): Promise<AgentCategory | null> {
    // Check if the category exists
    const existingCategory = await getAgentCategoryById(id)
    if (!existingCategory) {
        throw new Error('Category not found')
    }

    // If the name is being updated, check if another category with the same name already exists
    if (data.name && data.name !== existingCategory.name) {
        const existingCategories = await firestoreClient
            .collection(COLLECTION_NAME)
            .where('name', '==', data.name)
            .where('isActive', '==', true)
            .get()

        if (!existingCategories.empty) {
            const duplicateCategory = existingCategories.docs[0]
            if (duplicateCategory?.id !== id) {
                throw new Error('A category with that name already exists')
            }
        }
    }

    return await updateDocument<AgentCategory>(COLLECTION_NAME, id, data)
}

// Delete a category (soft delete)
export async function deleteAgentCategory(id: string): Promise<void> {
    // Check if the category exists
    const existingCategory = await getAgentCategoryById(id)
    if (!existingCategory) {
        throw new Error('Category not found')
    }

    // Check if it has active agents
    const agentsInCategory = await firestoreClient
        .collection('agents')
        .where('categoryId', '==', id)
        .where('isActive', '==', true)
        .get()

    if (!agentsInCategory.empty) {
        throw new Error('Cannot delete a category that has active agents')
    }

    await softDeleteDocument(COLLECTION_NAME, id)
}

// Search categories by name
export async function searchAgentCategories(searchTerm: string): Promise<AgentCategory[]> {
    return await searchDocuments<AgentCategory>(
        COLLECTION_NAME,
        'name',
        searchTerm,
        {
            where: [
                { field: 'isActive', operator: '==', value: true }
            ],
            orderBy: 'name',
            orderDirection: 'asc'
        }
    )
}

// Get active categories (for selects)
export async function getActiveAgentCategories(): Promise<AgentCategory[]> {
    const querySnapshot = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('isActive', '==', true)
        .orderBy('name', 'asc')
        .get()

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as AgentCategory[]
}

// Check if a category exists and is active
export async function isAgentCategoryActive(id: string): Promise<boolean> {
    const category = await getAgentCategoryById(id)
    return category?.isActive === true
}
