import { Timestamp } from 'firebase-admin/firestore'
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { firestoreClient } from './firebase.client'
import type { DocumentBase, BaseQueryOptions } from '../types/types'

/**
 * Generates a new UUID v4
 */
export function generateId(): string {
    return uuidv4()
}

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidId(id: string): boolean {
    return typeof id === 'string' && uuidValidate(id) && id.length === 36
}

/**
 * Validates an ID and throws an error if it is not valid
 * @throws {Error} If the ID is not a valid UUID
 */
export function validateId(id: string, fieldName: string = 'ID'): void {
    if (!isValidId(id)) {
        throw new Error(`${fieldName} must be a valid UUID`)
    }
}

// Create timestamps
export function createTimestamps() {
    const now = Timestamp.now()
    return {
        createdAt: now,
        updatedAt: now
    }
}

// Update timestamp
export function updateTimestamp() {
    return {
        updatedAt: Timestamp.now()
    }
}

// Convert Firestore document to an object with an ID
export function docToObject<T extends DocumentBase>(
    doc: FirebaseFirestore.DocumentSnapshot
): T | null {
    if (!doc.exists) return null

    return {
        id: doc.id,
        ...doc.data()
    } as T
}

// Convert QuerySnapshot to an array of objects
export function queryToArray<T extends DocumentBase>(
    querySnapshot: FirebaseFirestore.QuerySnapshot
): T[] {
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as T[]
}

// Build a query with filters
export function buildQuery(
    collection: FirebaseFirestore.CollectionReference,
    options: BaseQueryOptions = {}
): FirebaseFirestore.Query {
    let query: FirebaseFirestore.Query = collection

    // Apply where filters
    if (options.where) {
        options.where.forEach(filter => {
            query = query.where(filter.field, filter.operator, filter.value)
        })
    }

    // Apply ordering
    if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.orderDirection || 'asc')
    }

    // Apply offset
    if (options.offset) {
        query = query.offset(options.offset)
    }

    // Apply limit
    if (options.limit) {
        query = query.limit(options.limit)
    }

    return query
}

// Check if a document exists
export async function documentExists(
    collectionName: string,
    docId: string
): Promise<boolean> {
    const doc = await firestoreClient.collection(collectionName).doc(docId).get()
    return doc.exists
}

// Get a document by ID
export async function getDocumentById<T extends DocumentBase>(
    collectionName: string,
    docId: string,
    shouldValidateId: boolean = true
): Promise<T | null> {
    if (shouldValidateId && docId) {
        validateId(docId, `${collectionName} ID`)
    }
    const doc = await firestoreClient.collection(collectionName).doc(docId).get()
    return docToObject<T>(doc)
}

// Create a document
export async function createDocument<T extends Partial<DocumentBase>>(
    collectionName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    customId?: string
): Promise<T & DocumentBase> {
    // Validate that we are not trying to overwrite an existing document
    if (customId) {
        validateId(customId, `${collectionName} ID`)
        const exists = await documentExists(collectionName, customId)
        if (exists) {
            throw new Error(`A document already exists in ${collectionName} with the provided ID`)
        }
    }
    const id = customId || generateId()
    const timestamps = createTimestamps()

    const documentData = {
        id,
        ...data,
        ...timestamps
    } as T & DocumentBase

    await firestoreClient.collection(collectionName).doc(id).set(documentData)

    return documentData
}

// Update a document
export async function updateDocument<T extends DocumentBase>(
    collectionName: string,
    docId: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<T | null> {
    // Additional runtime protection
    const forbiddenFields = ['id', 'createdAt', 'updatedAt']
    const dataKeys = Object.keys(data)
    const hasForbiddenFields = dataKeys.some(key => forbiddenFields.includes(key))

    if (hasForbiddenFields) {
        throw new Error(`The following fields cannot be updated: ${forbiddenFields.join(', ')}`)
    }

    const updateData = {
        ...data,
        ...updateTimestamp()
    }

    await firestoreClient.collection(collectionName).doc(docId).update(updateData)
    return await getDocumentById<T>(collectionName, docId)
}

// Delete a document (soft delete)
export async function softDeleteDocument(
    collectionName: string,
    docId: string
): Promise<void> {
    await firestoreClient.collection(collectionName).doc(docId).update({
        isActive: false,
        ...updateTimestamp()
    })
}

// Permanently delete a document
export async function deleteDocument(
    collectionName: string,
    docId: string
): Promise<void> {
    await firestoreClient.collection(collectionName).doc(docId).delete()
}

// Get documents with pagination
export async function getPaginatedDocuments<T extends DocumentBase>(
    collectionName: string,
    options: BaseQueryOptions & { page?: number } = {}
): Promise<{
    documents: T[]
    total: number
    hasNext: boolean
    hasPrev: boolean
}> {
    const { page = 1, limit = 10, ...queryOptions } = options
    const offset = (page - 1) * limit

    // Build query for documents
    const query = buildQuery(
        firestoreClient.collection(collectionName),
        { ...queryOptions, limit, offset }
    )

    // Build query to count total (without limit/offset)
    const countQuery = buildQuery(
        firestoreClient.collection(collectionName),
        { where: queryOptions.where }
    )

    // Execute both queries
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

// Search documents by text
export async function searchDocuments<T extends DocumentBase>(
    collectionName: string,
    searchField: string,
    searchTerm: string,
    options: BaseQueryOptions = {}
): Promise<T[]> {
    // Firestore does not have native full-text search
    // We implement a prefix search
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

// Validate that required fields are present
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

export type SafeUpdateData<T extends DocumentBase> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>