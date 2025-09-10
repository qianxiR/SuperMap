import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'

export interface MentionItem {
  id: string
  name: string
  opened: boolean
  visible: boolean
}

export function useLayerMentions() {
  const mapStore = useMapStore()

  const isOpen = ref(false)
  const query = ref('')
  const caretIndex = ref(0)
  const trigger = '@'

  const allLayerNames = computed<string[]>(() => {
    const cfg = mapStore.mapConfig
    const names = cfg.vectorlayers.map(v => {
      const n = v.name
      const idx = n.indexOf('@')
      return idx >= 0 ? n.slice(0, idx) : n
    })
    return Array.from(new Set(names))
  })

  const openedLayers = computed(() => mapStore.vectorlayers)

  const catalog = computed<MentionItem[]>(() => {
    return allLayerNames.value.map(n => {
      const opened = openedLayers.value.find(v => v.name === n)
      return {
        id: n,
        name: n,
        opened: !!opened,
        visible: !!opened && !!opened.visible
      }
    })
  })

  const filtered = computed<MentionItem[]>(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return catalog.value
    return catalog.value.filter(it => it.name.toLowerCase().includes(q))
  })

  const openWith = (q: string, caret: number) => {
    query.value = q
    caretIndex.value = caret
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    query.value = ''
  }

  const parseForMention = (text: string, caret: number) => {
    const upto = text.slice(0, caret)
    const at = upto.lastIndexOf(trigger)
    if (at === -1) {
      close()
      return
    }
    const lastSpace = Math.max(upto.lastIndexOf(' '), upto.lastIndexOf('\n'))
    if (lastSpace > at) {
      close()
      return
    }
    const q = upto.slice(at + 1)
    openWith(q, caret)
  }

  const buildReplace = (text: string, caret: number, name: string) => {
    const upto = text.slice(0, caret)
    const at = upto.lastIndexOf(trigger)
    const head = text.slice(0, at)
    const tail = text.slice(caret)
    const token = `@${name} `
    const nextText = head + token + tail
    const nextCaret = (head + token).length
    return { nextText, nextCaret }
  }

  return {
    // state
    isOpen,
    query,
    caretIndex,
    catalog,
    filtered,
    // actions
    parseForMention,
    buildReplace,
    close
  }
}

export default useLayerMentions


