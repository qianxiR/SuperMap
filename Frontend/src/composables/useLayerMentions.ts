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
    // 从配置中获取 SuperMap 服务图层名称
    const cfg = mapStore.mapConfig
    const serviceNames = cfg.vectorlayers.map(v => {
      const n = v.name
      const idx = n.indexOf('@')
      return idx >= 0 ? n.slice(0, idx) : n
    })

    // 从运行时已加载的所有矢量图层获取名称（覆盖本地/查询/绘制/上传等分组）
    const runtimeNames = mapStore.vectorlayers.map(v => {
      const raw = (v as any)?.layer?.get ? (v as any).layer.get('layerName') || v.name : v.name
      const idx = raw.indexOf('@')
      return idx >= 0 ? raw.slice(0, idx) : raw
    })

    // 合并去重，确保“@ 提及”能识别所有图层组
    return Array.from(new Set([...serviceNames, ...runtimeNames]))
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
    let result = catalog.value
    
    if (q) {
      result = catalog.value.filter(it => it.name.toLowerCase().includes(q))
    }
    
    // 按状态排序：已显示 > 已隐藏 > 未打开
    return result.sort((a, b) => {
      // 已显示的图层置顶
      if (a.opened && a.visible && !(b.opened && b.visible)) return -1
      if (b.opened && b.visible && !(a.opened && a.visible)) return 1
      
      // 已隐藏的图层次之
      if (a.opened && !a.visible && !b.opened) return -1
      if (b.opened && !b.visible && !a.opened) return 1
      
      // 其他情况按名称排序
      return a.name.localeCompare(b.name)
    })
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


