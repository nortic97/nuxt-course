import { Timestamp } from 'firebase-admin/firestore'
import { firestoreClient } from './firebase.client'
import type { FirestoreDocument, FirestoreQueryOptions } from '../types/firestore'

// Generar ID único
export function generateId(): string {
    return firestoreClient.collection('_').doc().id
}

// Crear timestamps
export function createTimestamps() {
    const now = Timestamp.now()
    return {
        createdAt: now,
        updatedAt: now
    }
}

// Actualizar timestamp
export function updateTimestamp() {
    return {
        updatedAt: Timestamp.now()
    }
}

// Convertir documento de Firestore a objeto con ID
export function docToObject<T extends FirestoreDocument>(
    doc: FirebaseFirestore.DocumentSnapshot
): T | null {
    if (!doc.exists) return null

    return {
        id: doc.id,
        ...doc.data()
    } as T
}

// Convertir QuerySnapshot a array de objetos
export function queryToArray<T extends FirestoreDocument>(
    querySnapshot: FirebaseFirestore.QuerySnapshot
): T[] {
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as T[]
}

// Construir query con filtros
export function buildQuery(
    collection: FirebaseFirestore.CollectionReference,
    options: FirestoreQueryOptions = {}
): FirebaseFirestore.Query {
    let query: FirebaseFirestore.Query = collection

    // Aplicar filtros where
    if (options.where) {
        options.where.forEach(filter => {
            query = query.where(filter.field, filter.operator, filter.value)
        })
    }

    // Aplicar ordenamiento
    if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.orderDirection || 'asc')
    }

    // Aplicar offset
    if (options.offset) {
        query = query.offset(options.offset)
    }

    // Aplicar limit
    if (options.limit) {
        query = query.limit(options.limit)
    }

    return query
}

// Verificar si un documento existe
export async function documentExists(
    collectionName: string,
    docId: string
): Promise<boolean> {
    const doc = await firestoreClient.collection(collectionName).doc(docId).get()
    return doc.exists
}

// Obtener documento por ID
export async function getDocumentById<T extends FirestoreDocument>(
    collectionName: string,
    docId: string
): Promise<T | null> {
    const doc = await firestoreClient.collection(collectionName).doc(docId).get()
    return docToObject<T>(doc)
}

// Crear documento
export async function createDocument<T extends Partial<FirestoreDocument>>(
    collectionName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    customId?: string
): Promise<T & FirestoreDocument> {
    const id = customId || generateId()
    const timestamps = createTimestamps()

    const documentData = {
        id,
        ...data,
        ...timestamps
    } as T & FirestoreDocument

    await firestoreClient.collection(collectionName).doc(id).set(documentData)

    return documentData
}

// Actualizar documento
export async function updateDocument<T extends FirestoreDocument>(
    collectionName: string,
    docId: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<T | null> {
    // Protección adicional en runtime
    const forbiddenFields = ['id', 'createdAt', 'updatedAt']
    const dataKeys = Object.keys(data)
    const hasForbiddenFields = dataKeys.some(key => forbiddenFields.includes(key))

    if (hasForbiddenFields) {
        throw new Error(`No se pueden actualizar los campos: ${forbiddenFields.join(', ')}`)
    }

    const updateData = {
        ...data,
        ...updateTimestamp()
    }

    await firestoreClient.collection(collectionName).doc(docId).update(updateData)
    return await getDocumentById<T>(collectionName, docId)
}

// Eliminar documento (soft delete)
export async function softDeleteDocument(
    collectionName: string,
    docId: string
): Promise<void> {
    await firestoreClient.collection(collectionName).doc(docId).update({
        isActive: false,
        ...updateTimestamp()
    })
}

// Eliminar documento permanentemente
export async function deleteDocument(
    collectionName: string,
    docId: string
): Promise<void> {
    await firestoreClient.collection(collectionName).doc(docId).delete()
}

// Obtener documentos con paginación
export async function getPaginatedDocuments<T extends FirestoreDocument>(
    collectionName: string,
    options: FirestoreQueryOptions & { page?: number } = {}
): Promise<{
    documents: T[]
    total: number
    hasNext: boolean
    hasPrev: boolean
}> {
    const { page = 1, limit = 10, ...queryOptions } = options
    const offset = (page - 1) * limit

    // Construir query para documentos
    const query = buildQuery(
        firestoreClient.collection(collectionName),
        { ...queryOptions, limit, offset }
    )

    // Construir query para contar total (sin limit/offset)
    const countQuery = buildQuery(
        firestoreClient.collection(collectionName),
        { where: queryOptions.where }
    )

    // Ejecutar ambas queries
    const [querySnapshot, countSnapshot] = await Promise.all([
        query.get(),
        countQuery.get()
    ])

    const documents = queryToArray<T>(querySnapshot)
    const total = countSnapshot.size
    const hasNext = (page * limit) < total
    const hasPrev = page > 1

    return {
        documents,
        total,
        hasNext,
        hasPrev
    }
}

// Buscar documentos por texto
export async function searchDocuments<T extends FirestoreDocument>(
    collectionName: string,
    searchField: string,
    searchTerm: string,
    options: FirestoreQueryOptions = {}
): Promise<T[]> {
    // Firestore no tiene búsqueda de texto completo nativa
    // Implementamos búsqueda por prefijo
    const query = buildQuery(
        firestoreClient.collection(collectionName),
        {
            ...options,
            where: [
                ...(options.where || []),
                {
                    field: searchField,
                    operator: '>=',
                    value: searchTerm
                },
                {
                    field: searchField,
                    operator: '<=',
                    value: searchTerm + '\uf8ff'
                }
            ]
        }
    )

    const querySnapshot = await query.get()
    return queryToArray<T>(querySnapshot)
}

// Validar que los campos requeridos estén presentes
export function validateRequiredFields<T extends Record<string, unknown>>(
    data: T,
    requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
    const missingFields = requiredFields.filter(field =>
        data[field] === undefined || data[field] === null || data[field] === ''
    ) as string[]

    return {
        isValid: missingFields.length === 0,
        missingFields
    }
}

export type SafeUpdateData<T extends FirestoreDocument> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>