import type { Agent } from "~~/layers/middleware/server/types/types"
import useAgents from "./useAgents"

export default function useAgent(agentId: string) {
  const { agents } = useAgents()

  const agent = computed(() =>
    agents.value.find((a) => a.id === agentId)
  )

  function updateAgentInList(updatedData: Partial<Agent>) {
    if (!agent.value) return
    if (!Array.isArray(agents.value)) {
      console.error('agents.value no es un array:', agents.value)
      return
    }

    agents.value = agents.value.map((a) =>
      a.id === agentId ? { ...a, ...updatedData } : a
    )
  }

  async function updateAgent(updatedAgent: Partial<Agent>) {
    if (!agent.value) return

    const originalAgent = { ...agent.value }
    updateAgentInList(updatedAgent)

    try {
      const response = await $fetch<Agent>(
        `/api/agents/${agentId}`,
        {
          method: 'PUT',
          headers: useRequestHeaders(['cookie']),
          body: updatedAgent,
        }
      )
      updateAgentInList(response)
      return response
    } catch (error) {
      console.error('Error updating agent', error)
      updateAgentInList(originalAgent)
      throw error
    }
  }

  return {
    agent,
    updateAgent,
  }
}