import { firestoreClient } from '../utils/firebase.client'
import {
    createDocument,
    updateDocument,
    getDocumentById,
    getPaginatedDocuments,
    validateRequiredFields
} from '../utils/firestore.helpers'
import type {
    User,
    PaginationParams
} from '../types/firestore'

const COLLECTION_NAME = 'users'

// Crear o actualizar usuario (para auth)
export async function createOrUpdateUser(userData: {
    id?: string
    email: string
    name?: string | null
    avatar?: string
    provider?: 'google' | 'github'
}): Promise<User> {
    // Validar campos requeridos
    const validation = validateRequiredFields(userData, ['email'])
    if (!validation.isValid) {
        throw new Error(`Campos requeridos faltantes: ${validation.missingFields.join(', ')}`)
    }

    // Buscar usuario existente por email
    const existingUserQuery = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('email', '==', userData.email)
        .where('isActive', '==', true)
        .get()

    if (!existingUserQuery.empty) {
        // Usuario existe, actualizar datos si es necesario
        const existingDoc = existingUserQuery.docs[0]
        if (!existingDoc) {
            throw new Error('Error al obtener documento de usuario existente')
        }

        const existingUser = existingDoc.data() as User

        // Actualizar solo si hay cambios
        const updateData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'email'>> = {}
        if (userData.name && userData.name !== existingUser.name) {
            updateData.name = userData.name
        }
        if (userData.avatar && userData.avatar !== existingUser.avatar) {
            updateData.avatar = userData.avatar
        }
        if (userData.provider && userData.provider !== existingUser.provider) {
            updateData.provider = userData.provider
        }

        if (Object.keys(updateData).length > 0) {
            const updatedUser = await updateDocument<User>(COLLECTION_NAME, existingDoc.id, updateData)
            return updatedUser!
        }

        return {
            ...existingUser,
            id: existingDoc.id
        }
    }

    // Crear nuevo usuario
    const newUserData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
        email: userData.email,
        name: userData.name || undefined,
        avatar: userData.avatar || undefined,
        provider: userData.provider || undefined,
        isActive: true,
        subscription: {
            plan: 'free' as const
        }
    }

    return await createDocument<User>(COLLECTION_NAME, newUserData, userData.id)
}

// Obtener usuario por ID
export async function getUserById(id: string): Promise<User | null> {
    return await getDocumentById<User>(COLLECTION_NAME, id)
}

// Obtener usuario por email
export async function getUserByEmail(email: string): Promise<User | null> {
    const querySnapshot = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('email', '==', email)
        .where('isActive', '==', true)
        .limit(1)
        .get()

    if (querySnapshot.empty) return null

    const doc = querySnapshot.docs[0]
    if (!doc) return null

    return {
        id: doc.id,
        ...doc.data()
    } as User
}

// Obtener todos los usuarios con paginación
export async function getAllUsers(params: PaginationParams = {}) {
    const { page = 1, limit = 10, orderBy = 'createdAt', orderDirection = 'desc' } = params

    return await getPaginatedDocuments<User>(COLLECTION_NAME, {
        page,
        limit,
        orderBy,
        orderDirection,
        where: [
            { field: 'isActive', operator: '==', value: true }
        ]
    })
}

// Actualizar usuario
export async function updateUser(
    id: string,
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'email'>>
): Promise<User | null> {
    // Verificar que el usuario existe
    const existingUser = await getUserById(id)
    if (!existingUser) {
        throw new Error('Usuario no encontrado')
    }

    return await updateDocument<User>(COLLECTION_NAME, id, data)
}

// Desactivar usuario (soft delete)
export async function deactivateUser(id: string): Promise<void> {
    const existingUser = await getUserById(id)
    if (!existingUser) {
        throw new Error('Usuario no encontrado')
    }

    await updateDocument<User>(COLLECTION_NAME, id, { isActive: false })
}

// Verificar si un usuario existe y está activo
export async function isUserActive(id: string): Promise<boolean> {
    const user = await getUserById(id)
    return user?.isActive === true
}

// Obtener estadísticas de usuario (para dashboard)
export async function getUserStats(userId: string): Promise<{
    totalChats: number
    totalAgents: number
    subscription: User['subscription']
}> {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('Usuario no encontrado')
    }

    // Contar chats activos
    const chatsQuery = await firestoreClient
        .collection('chats')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get()

    // Contar agentes disponibles
    const userAgentsQuery = await firestoreClient
        .collection('userAgents')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get()

    return {
        totalChats: chatsQuery.size,
        totalAgents: userAgentsQuery.size,
        subscription: user.subscription || { plan: 'free' }
    }
}
