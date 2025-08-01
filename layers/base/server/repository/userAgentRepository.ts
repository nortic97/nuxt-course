import { firestoreClient } from '../utils/firebase.client'
import { Timestamp } from 'firebase-admin/firestore'
import {
    createDocument,
    updateDocument,
    getDocumentById,
    getPaginatedDocuments,
    validateRequiredFields
} from '../utils/firestore.helpers'
import { getUserById } from './userRepository'
import { getAgentById } from './agentRepository'
import type {
    UserAgent,
    AgentWithCategory,
    PaginationParams
} from '../types/firestore'

const COLLECTION_NAME = 'userAgents'

// Crear acceso de usuario a agente (después del pago)
export async function createUserAgent(data: {
    userId: string
    agentId: string
    paymentId?: string
    expiresAt?: Date
}): Promise<UserAgent> {
    // Validar campos requeridos
    const validation = validateRequiredFields(data, ['userId', 'agentId'])
    if (!validation.isValid) {
        throw new Error(`Campos requeridos faltantes: ${validation.missingFields.join(', ')}`)
    }

    // Verificar que el usuario existe y está activo
    const user = await getUserById(data.userId)
    if (!user || !user.isActive) {
        throw new Error('El usuario especificado no existe o no está activo')
    }

    // Verificar que el agente existe y está activo
    const agent = await getAgentById(data.agentId)
    if (!agent || !agent.isActive) {
        throw new Error('El agente especificado no existe o no está activo')
    }

    // Verificar que no exista ya esta relación activa
    const existingUserAgent = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('userId', '==', data.userId)
        .where('agentId', '==', data.agentId)
        .where('isActive', '==', true)
        .get()

    if (!existingUserAgent.empty) {
        // Si existe pero ha expirado, podemos crear uno nuevo
        const existingDoc = existingUserAgent.docs[0]
        const existingData = existingDoc?.data()

        if (existingData?.expiresAt && existingData.expiresAt.toDate() > new Date()) {
            throw new Error('El usuario ya tiene acceso activo a este agente')
        }

        // Desactivar el acceso expirado
        await updateDocument<UserAgent>(COLLECTION_NAME, existingDoc!.id, { isActive: false })
    }

    // Crear el UserAgent
    const userAgentData = {
        userId: data.userId,
        agentId: data.agentId,
        paidAt: Timestamp.now(),
        expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : undefined,
        isActive: true,
        paymentId: data.paymentId || undefined
    }

    return await createDocument<UserAgent>(COLLECTION_NAME, userAgentData)
}

// Obtener agentes de un usuario con detalles
export async function getUserAgentsWithDetails(
    userId: string,
    params: PaginationParams = {}
): Promise<{
    documents: Array<UserAgent & { agent: AgentWithCategory }>
    total: number
    hasNext: boolean
    hasPrev: boolean
}> {
    const { page = 1, limit = 10, orderBy = 'paidAt', orderDirection = 'desc' } = params

    const result = await getPaginatedDocuments<UserAgent>(COLLECTION_NAME, {
        page,
        limit,
        orderBy,
        orderDirection,
        where: [
            { field: 'userId', operator: '==', value: userId },
            { field: 'isActive', operator: '==', value: true }
        ]
    })

    // Poblar datos del agente para cada UserAgent
    const userAgentsWithDetails = []

    for (const userAgent of result.documents) {
        const agent = await getAgentById(userAgent.agentId)
        if (agent) {
            userAgentsWithDetails.push({
                ...userAgent,
                agent
            })
        }
    }

    return {
        documents: userAgentsWithDetails,
        total: result.total,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
    }
}

// Obtener UserAgent específico por ID
export async function getUserAgentById(id: string): Promise<UserAgent | null> {
    return await getDocumentById<UserAgent>(COLLECTION_NAME, id)
}

// Verificar si un usuario tiene acceso a un agente
export async function checkUserAgentAccess(userId: string, agentId: string): Promise<{
    hasAccess: boolean
    userAgent?: UserAgent
    reason?: string
}> {
    const userAgentQuery = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('userId', '==', userId)
        .where('agentId', '==', agentId)
        .where('isActive', '==', true)
        .limit(1)
        .get()

    if (userAgentQuery.empty) {
        return {
            hasAccess: false,
            reason: 'No tiene acceso a este agente'
        }
    }

    const userAgentDoc = userAgentQuery.docs[0]
    const userAgent = {
        id: userAgentDoc!.id,
        ...userAgentDoc!.data()
    } as UserAgent

    // Verificar si no ha expirado
    if (userAgent.expiresAt && userAgent.expiresAt.toDate() < new Date()) {
        // Desactivar acceso expirado
        await updateDocument<UserAgent>(COLLECTION_NAME, userAgent.id, { isActive: false })

        return {
            hasAccess: false,
            reason: 'El acceso ha expirado'
        }
    }

    return {
        hasAccess: true,
        userAgent
    }
}

// Revocar acceso a agente
export async function revokeUserAgent(userId: string, agentId: string): Promise<void> {
    const userAgentQuery = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('userId', '==', userId)
        .where('agentId', '==', agentId)
        .where('isActive', '==', true)
        .get()

    if (userAgentQuery.empty) {
        throw new Error('No se encontró acceso activo para este agente')
    }

    const userAgentDoc = userAgentQuery.docs[0]
    await updateDocument<UserAgent>(COLLECTION_NAME, userAgentDoc!.id, { isActive: false })
}

// Extender acceso de un usuario a un agente
export async function extendUserAgentAccess(
    userId: string,
    agentId: string,
    newExpirationDate: Date
): Promise<UserAgent | null> {
    const accessCheck = await checkUserAgentAccess(userId, agentId)

    if (!accessCheck.hasAccess || !accessCheck.userAgent) {
        throw new Error('No se encontró acceso activo para extender')
    }

    return await updateDocument<UserAgent>(
        COLLECTION_NAME,
        accessCheck.userAgent.id,
        { expiresAt: Timestamp.fromDate(newExpirationDate) }
    )
}

// Obtener estadísticas de accesos de usuario
export async function getUserAgentStats(userId: string): Promise<{
    totalActive: number
    totalExpired: number
    expiringIn7Days: number
}> {
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Accesos activos
    const activeQuery = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get()

    let totalActive = 0
    let expiringIn7Days = 0

    activeQuery.docs.forEach(doc => {
        const data = doc.data()
        if (!data.expiresAt || data.expiresAt.toDate() > now) {
            totalActive++

            if (data.expiresAt && data.expiresAt.toDate() <= in7Days) {
                expiringIn7Days++
            }
        }
    })

    // Accesos expirados
    const expiredQuery = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('userId', '==', userId)
        .where('isActive', '==', false)
        .get()

    return {
        totalActive,
        totalExpired: expiredQuery.size,
        expiringIn7Days
    }
}
