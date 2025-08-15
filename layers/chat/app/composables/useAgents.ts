import type { Agent } from "~~/layers/base/server/types/firestore"

export default function useAgents() {
  const agents = useState<Agent[]>('agents', () => [])

  const { data, execute, status } = useFetch<Agent[]>(
    '/api/agents',
    {
      default: () => [],
      immediate: false,
      headers: useRequestHeaders(['cookie']),
    }
  )

  async function fetchAgents() {
    if (status.value !== 'idle') return
    await execute()
    agents.value = data.value?.data || []
  }

  return { agents, fetchAgents }
}
