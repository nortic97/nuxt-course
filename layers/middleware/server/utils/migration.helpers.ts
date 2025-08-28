import { firestoreClient } from './firebase.client'
import { updateTimestamp } from './firestore.helpers'
import { logger } from './logger'

/**
 * Migrate existing documents to add the ID field.
 * USE ONLY ONCE to migrate existing data.
 */
export async function migrateDocumentsAddId(collectionName: string): Promise<void> {
    logger.info(`Starting migration for ${collectionName}...`)

    try {
        const snapshot = await firestoreClient.collection(collectionName).get()

        if (snapshot.empty) {
            logger.info(`No documents to migrate in ${collectionName}`)
            return
        }

        const batch = firestoreClient.batch()
        let count = 0

        snapshot.docs.forEach(doc => {
            const data = doc.data()

            // Only add ID if it doesn't exist
            if (!data.id) {
                const docRef = firestoreClient.collection(collectionName).doc(doc.id)
                batch.update(docRef, {
                    id: doc.id,
                    ...updateTimestamp()
                })
                count++
            }
        })

        if (count > 0) {
            await batch.commit()
            logger.info(`Migration completed: ${count} documents updated in ${collectionName}`)
        } else {
            logger.info(`All documents in ${collectionName} already have an ID field`)
        }
    } catch (error) {
        logger.error(`Error migrating ${collectionName}`, error as Error, { collectionName })
        throw error
    }
}

/**
 * Migrate all main collections.
 */
export async function migrateAllCollections(): Promise<void> {
    const collections = ['users', 'agents', 'agentCategories', 'userAgents', 'chats', 'messages']

    for (const collection of collections) {
        await migrateDocumentsAddId(collection)
    }

    logger.info('Migration of all collections complete', {
      collections: collections.join(', ')
    })
}
