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

// Obtener todos los agentes con paginación y filtros
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

    // Filtros
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

    // Si hay búsqueda, usar función de búsqueda
    if (search && typeof search === 'string') {
        const searchResult = await searchAgents(search, { categoryId, isActive, minPrice, maxPrice })
        // Para mantener consistencia con la paginación, agregamos hasNext y hasPrev
        return {
            ...searchResult,
            hasNext: false, // La búsqueda no maneja paginación
            hasPrev: false
        }
    }

    // Obtener agentes con paginación
    const result = await getPaginatedDocuments<Agent>(COLLECTION_NAME, {
        page,
        limit,
        orderBy,
        orderDirection,
        where: whereConditions
    })

    // Poblar categorías para cada agente
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

// Obtener agente por ID con categoría
export async function getAgentById(id: string): Promise<AgentWithCategory | null> {
    const agent = await getDocumentById<Agent>(COLLECTION_NAME, id)
    if (!agent) return null

    // Obtener la categoría
    const category = await getDocumentById<AgentCategory>('agentCategories', agent.categoryId)
    if (!category) return null

    return {
        ...agent,
        category
    }
}

// Crear nuevo agente
export async function createAgent(data: CreateAgentRequest): Promise<AgentWithCategory> {
    // Validar campos requeridos
    const validation = validateRequiredFields(data, ['name', 'price', 'categoryId'])
    if (!validation.isValid) {
        throw new Error(`Campos requeridos faltantes: ${validation.missingFields.join(', ')}`)
    }

    // Validar que el precio sea válido
    if (data.price < 0) {
        throw new Error('El precio no puede ser negativo')
    }

    // Verificar que la categoría existe y está activa
    const categoryExists = await isAgentCategoryActive(data.categoryId)
    if (!categoryExists) {
        throw new Error('La categoría especificada no existe o no está activa')
    }

    // Verificar que no exista otro agente con el mismo nombre en la misma categoría
    const existingAgents = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('name', '==', data.name)
        .where('categoryId', '==', data.categoryId)
        .where('isActive', '==', true)
        .get()

    if (!existingAgents.empty) {
        throw new Error('Ya existe un agente con ese nombre en esta categoría')
    }

    // Crear el agente
    const agentData = {
        ...data,
        isActive: true
    }

    const newAgent = await createDocument<Agent>(COLLECTION_NAME, agentData)

    // Obtener la categoría para retornar el agente completo
    const category = await getDocumentById<AgentCategory>('agentCategories', newAgent.categoryId)

    return {
        ...newAgent,
        category: category!
    }
}

// Actualizar agente
export async function updateAgent(
    id: string,
    data: UpdateAgentRequest
): Promise<AgentWithCategory | null> {
    // Verificar que el agente existe
    const existingAgent = await getDocumentById<Agent>(COLLECTION_NAME, id)
    if (!existingAgent) {
        throw new Error('Agente no encontrado')
    }

    // Validar precio si se está actualizando
    if (data.price !== undefined && data.price < 0) {
        throw new Error('El precio no puede ser negativo')
    }

    // Verificar categoría si se está actualizando
    if (data.categoryId && data.categoryId !== existingAgent.categoryId) {
        const categoryExists = await isAgentCategoryActive(data.categoryId)
        if (!categoryExists) {
            throw new Error('La categoría especificada no existe o no está activa')
        }
    }

    // Verificar nombre único en categoría si se está actualizando
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
                throw new Error('Ya existe un agente con ese nombre en esta categoría')
            }
        }
    }

    const updatedAgent = await updateDocument<Agent>(COLLECTION_NAME, id, data)
    if (!updatedAgent) return null

    // Obtener la categoría
    const category = await getDocumentById<AgentCategory>('agentCategories', updatedAgent.categoryId)

    return {
        ...updatedAgent,
        category: category!
    }
}

// Eliminar agente (soft delete)
export async function deleteAgent(id: string): Promise<void> {
    // Verificar que el agente existe
    const existingAgent = await getDocumentById<Agent>(COLLECTION_NAME, id)
    if (!existingAgent) {
        throw new Error('Agente no encontrado')
    }

    // Verificar que no tenga chats activos
    const activeChats = await firestoreClient
        .collection('chats')
        .where('agentId', '==', id)
        .where('isActive', '==', true)
        .get()

    if (!activeChats.empty) {
        throw new Error('No se puede eliminar un agente que tiene chats activos')
    }

    await softDeleteDocument(COLLECTION_NAME, id)
}

// Buscar agentes por texto
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

    // Aplicar filtros adicionales
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

    // Obtener categorías para cada agente
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

// Obtener agentes por categoría
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

// Verificar si un usuario puede usar un agente
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

    // Verificar si no ha expirado
    if (userAgent.expiresAt && userAgent.expiresAt.toDate() < new Date()) {
        return false
    }

    return true
}

// Obtener agentes disponibles para un usuario
export async function getAvailableAgentsForUser(userId: string): Promise<AgentWithCategory[]> {
    // Obtener los agentes que el usuario ha pagado
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

    // Obtener los agentes
    const agentsWithCategories: AgentWithCategory[] = []

    for (const agentId of agentIds) {
        const agent = await getAgentById(agentId)
        if (agent && agent.isActive) {
            agentsWithCategories.push(agent)
        }
    }

    return agentsWithCategories.sort((a, b) => a.name.localeCompare(b.name))
}
