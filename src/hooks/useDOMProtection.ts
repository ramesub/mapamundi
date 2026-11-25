import { useEffect, useLayoutEffect, useRef } from 'react'

export function useDOMProtection() {
  const expected = useRef(new WeakMap<Text, string>())
  const reactPending = useRef(false)

  useLayoutEffect(() => {
    reactPending.current = true
    Promise.resolve().then(() => { reactPending.current = false })
  })

  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return

    const isSVG = (node: Node) => !!(node as Element).closest?.('svg')

    // Check if an element was added by React (has React internals attached)
    const isReactNode = (el: Element) =>
      Object.keys(el).some(k => k.startsWith('__react'))

    const record = (node: Node) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
      let n: Node | null
      while ((n = walker.nextNode())) {
        const t = n as Text
        if (t.parentElement && isSVG(t.parentElement)) continue
        expected.current.set(t, t.data)
      }
    }

    record(root)

    const observer = new MutationObserver((mutations) => {
      // Track parents where React text nodes were removed by external code.
      // We check parent.isConnected (whether it's still in the DOM) to distinguish
      // React legitimately unmounting a subtree vs. an extension removing just the text.
      type RestoreEntry = {
        removedTexts: Array<{ node: Text; exp: string; nextSibling: Node | null }>
        addedElements: Element[]
      }
      const parentRestores = new Map<Element, RestoreEntry>()

      for (const m of mutations) {
        const parentEl =
          m.target.nodeType === Node.ELEMENT_NODE
            ? (m.target as Element)
            : (m.target as Text).parentElement

        if (!parentEl || isSVG(parentEl)) continue

        if (m.type === 'characterData') {
          const t = m.target as Text
          if (!t.parentElement || isSVG(t.parentElement)) continue

          if (reactPending.current && isReactNode(t.parentElement)) {
            // React is legitimately updating this text node: record new value
            expected.current.set(t, t.data)
          } else if (!reactPending.current) {
            // External modification outside React commit: revert if known
            const exp = expected.current.get(t)
            if (exp !== undefined && t.data !== exp) {
              t.data = exp
            }
          }
          // If reactPending && parent is NOT a React node (e.g. extension-injected FONT):
          // ignore — we don't track extension-owned elements
        } else if (m.type === 'childList') {
          // Track React-managed text nodes that were removed
          m.removedNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              const t = node as Text
              const exp = expected.current.get(t)
              if (exp !== undefined) {
                // The parent is still connected → extension removed the text node
                // The parent is NOT connected → React unmounted the whole subtree (OK)
                if (parentEl.isConnected) {
                  if (!parentRestores.has(parentEl)) {
                    parentRestores.set(parentEl, { removedTexts: [], addedElements: [] })
                  }
                  parentRestores.get(parentEl)!.removedTexts.push({
                    node: t,
                    exp,
                    nextSibling: m.nextSibling,
                  })
                }
              }
            }
          })

          // Track elements added by extension (non-React nodes)
          m.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element
              if (!isReactNode(el)) {
                // Not a React element — it was injected by an extension
                if (!parentRestores.has(parentEl)) {
                  parentRestores.set(parentEl, { removedTexts: [], addedElements: [] })
                }
                parentRestores.get(parentEl)!.addedElements.push(el)
              } else {
                // React added this element: record its text nodes
                record(el)
              }
            } else if (node.nodeType === Node.TEXT_NODE && reactPending.current) {
              // React added a text node during commit
              expected.current.set(node as Text, (node as Text).data)
            }
          })
        }
      }

      // Restore parents where React text nodes were removed by an extension
      for (const [parent, { removedTexts, addedElements }] of parentRestores) {
        if (removedTexts.length === 0) continue

        // Remove extension-injected elements from this parent
        for (const el of addedElements) {
          try { parent.removeChild(el) } catch (_) { /* already gone */ }
        }

        // Re-insert the original React text nodes
        for (const { node, exp, nextSibling } of removedTexts) {
          node.data = exp
          try {
            if (nextSibling && (nextSibling as Node).parentNode === parent) {
              parent.insertBefore(node, nextSibling)
            } else {
              parent.appendChild(node)
            }
          } catch (_) { /* ignore */ }
        }
      }
    })

    observer.observe(root, {
      characterData: true,
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])
}
