import type { CollectionReference, DocumentData } from "firebase-admin/firestore"
import { firestoreClient } from "../utils/firebase.client"


const agentsCollection = firestoreClient.collection('agents') as CollectionReference<DocumentData>

export const getAgentById = async (agentId: string) => {
  const doc = await agentsCollection.doc(agentId).get()
  return doc.exists ? doc.data() : null
}

export const createAgent = async (data: never) => {
  const docRef = await agentsCollection.add(data)
  return docRef.id
}
