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
} from '../types/firestore'

const COLLECTION_NAME = 'agentCategories'

// Obtener todas las categorías con paginación
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

// Obtener categoría por ID
export async function getAgentCategoryById(id: string): Promise<AgentCategory | null> {
    return await getDocumentById<AgentCategory>(COLLECTION_NAME, id)
}

// Crear nueva categoría
export async function createAgentCategory(data: CreateAgentCategoryRequest): Promise<AgentCategory> {
    // Validar campos requeridos
    const validation = validateRequiredFields(data, ['name'])
    if (!validation.isValid) {
        throw new Error(`Campos requeridos faltantes: ${validation.missingFields.join(', ')}`)
    }

    // Verificar que el nombre no exista
    const existingCategories = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('name', '==', data.name)
        .where('isActive', '==', true)
        .get()

    if (!existingCategories.empty) {
        throw new Error('Ya existe una categoría con ese nombre')
    }

    // Crear la categoría
    const categoryData = {
        ...data,
        isActive: true
    }

    return await createDocument<AgentCategory>(COLLECTION_NAME, categoryData)
}

// Actualizar categoría
export async function updateAgentCategory(
    id: string,
    data: UpdateAgentCategoryRequest
): Promise<AgentCategory | null> {
    // Verificar que la categoría existe
    const existingCategory = await getAgentCategoryById(id)
    if (!existingCategory) {
        throw new Error('Categoría no encontrada')
    }

    // Si se está actualizando el nombre, verificar que no exista otro con el mismo nombre
    if (data.name && data.name !== existingCategory.name) {
        const existingCategories = await firestoreClient
            .collection(COLLECTION_NAME)
            .where('name', '==', data.name)
            .where('isActive', '==', true)
            .get()

        if (!existingCategories.empty) {
            const duplicateCategory = existingCategories.docs[0]
            if (duplicateCategory?.id !== id) {
                throw new Error('Ya existe una categoría con ese nombre')
            }
        }
    }

    return await updateDocument<AgentCategory>(COLLECTION_NAME, id, data)
}

// Eliminar categoría (soft delete)
export async function deleteAgentCategory(id: string): Promise<void> {
    // Verificar que la categoría existe
    const existingCategory = await getAgentCategoryById(id)
    if (!existingCategory) {
        throw new Error('Categoría no encontrada')
    }

    // Verificar que no tenga agentes activos
    const agentsInCategory = await firestoreClient
        .collection('agents')
        .where('categoryId', '==', id)
        .where('isActive', '==', true)
        .get()

    if (!agentsInCategory.empty) {
        throw new Error('No se puede eliminar una categoría que tiene agentes activos')
    }

    await softDeleteDocument(COLLECTION_NAME, id)
}

// Buscar categorías por nombre
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

// Obtener categorías activas (para selects)
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

// Verificar si una categoría existe y está activa
export async function isAgentCategoryActive(id: string): Promise<boolean> {
    const category = await getAgentCategoryById(id)
    return category?.isActive === true
}
