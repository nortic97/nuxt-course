import { firestoreClient } from './firebase.client'
import { updateTimestamp } from './firestore.helpers'

/**
 * Migrar documentos existentes para agregar el campo ID
 * USAR SOLO UNA VEZ para migrar datos existentes
 */
export async function migrateDocumentsAddId(collectionName: string): Promise<void> {
    console.log(`🔄 Iniciando migración de ${collectionName}...`)

    try {
        const snapshot = await firestoreClient.collection(collectionName).get()

        if (snapshot.empty) {
            console.log(`✅ No hay documentos en ${collectionName} para migrar`)
            return
        }

        const batch = firestoreClient.batch()
        let count = 0

        snapshot.docs.forEach(doc => {
            const data = doc.data()

            // Solo agregar ID si no existe
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
            console.log(`✅ Migración completada: ${count} documentos actualizados en ${collectionName}`)
        } else {
            console.log(`✅ Todos los documentos en ${collectionName} ya tienen campo ID`)
        }
    } catch (error) {
        console.error(`❌ Error en migración de ${collectionName}:`, error)
        throw error
    }
}

/**
 * Migrar todas las colecciones principales
 */
export async function migrateAllCollections(): Promise<void> {
    const collections = ['users', 'agents', 'agentCategories', 'userAgents', 'chats', 'messages']

    for (const collection of collections) {
        await migrateDocumentsAddId(collection)
    }

    console.log('🎉 Migración completa de todas las colecciones')
}
