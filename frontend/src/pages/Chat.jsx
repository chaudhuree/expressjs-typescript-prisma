import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchUsers, fetchMe } from '../api/users'
import { listConversations, getMessages, markSeen, sendMessage as sendMessageApi } from '../api/chat'
import { getSocket, onMessageNew, onUserOnline, onUserOffline, disconnectSocket } from '../socket'
import { logout as logoutAuth } from '../api/auth'

export default function Chat(){
  const nav = useNavigate()
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([]) // search results only
  const [conversations, setConversations] = useState([]) // past chats
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [unreadCounts, setUnreadCounts] = useState({}) // { [userId]: number }

function buildUnreadFromConvos(convos){
  const out = {}
  ;(convos || []).forEach((c) => {
    const otherId = c?.otherUser?.id
    if(otherId){ out[otherId] = c?.unseenCount || 0 }
  })
  return out
}

function getMessageKey(m){
  if(!m) return 'nil'
  if(m.id) return `id:${m.id}`
  // fallback composite (handles transports that might omit id)
  const s = m.senderId || 's'
  const r = m.receiverId || 'r'
  const t = m.createdAt || 't'
  const c = (m.content || '').slice(0, 50)
  return `k:${s}:${r}:${t}:${c}`
}
  const inputRef = useRef(null)
  const messagesRef = useRef(null)
  const selectedUserRef = useRef(null)
  const meRef = useRef(null)
  const processedIdsRef = useRef(new Set())

  const isSearching = useMemo(() => Boolean(search && search.trim().length), [search])
  const sidebarUsers = useMemo(() => {
    if(isSearching){
      return users.filter(u => u.id !== me?.id)
    }
    // default: show only users from conversations
    return (conversations || [])
      .map(c => c.otherUser)
      .filter(u => u && u.id !== me?.id)
  }, [isSearching, users, conversations, me])

  useEffect(() => {
    let unsub = []
    ;(async () => {
      try{
        setLoading(true)
        const [meData, convos] = await Promise.all([
          fetchMe(), listConversations()
        ])
        setMe(meData)
        setConversations(convos || [])
        setUnreadCounts(buildUnreadFromConvos(convos))
      } finally { setLoading(false) }

      const s = getSocket()
      // Register listeners once; use refs to avoid stale closures
      unsub.push(onMessageNew(async ({ message }) => {
        // Prevent double handling of the same event (e.g., duplicate socket emits)
        const key = getMessageKey(message)
        if(processedIdsRef.current.has(key)) return
        if(processedIdsRef.current.size > 2000){ processedIdsRef.current = new Set() }
        processedIdsRef.current.add(key)
        const currentSelected = selectedUserRef.current
        const currentMe = meRef.current
        if(currentSelected && (message.senderId === currentSelected.id || message.receiverId === currentSelected.id)){
          setMessages(prev => dedupeById([...prev, message]))
          await markSeen(currentSelected.id)
          // keep unread badge at zero for active thread
          setUnreadCounts(prev => ({ ...prev, [currentSelected.id]: 0 }))
          scrollToBottom()
        } else {
          const convos = await listConversations();
          setConversations(convos || [])
          setUnreadCounts(buildUnreadFromConvos(convos))
        }
      }))
      unsub.push(onUserOnline(async () => {
        const convos = await listConversations();
        setConversations(convos || [])
        setUnreadCounts(buildUnreadFromConvos(convos))
      }))
      unsub.push(onUserOffline(async () => {
        const convos = await listConversations();
        setConversations(convos || [])
        setUnreadCounts(buildUnreadFromConvos(convos))
      }))
    })()

    return () => { unsub.forEach(off => off && off()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep refs in sync
  useEffect(() => { selectedUserRef.current = selectedUser }, [selectedUser])
  useEffect(() => { meRef.current = me }, [me])

  // Server-side search with debounce (only when search has value)
  useEffect(() => {
    const t = setTimeout(async () => {
      if(search && search.trim().length){
        const list = await fetchUsers({ search })
        setUsers(list || [])
      } else {
        setUsers([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const openChat = async (u) => {
    setSelectedUser(u)
    const data = await getMessages(u.id)
    const list = Array.isArray(data?.messages) ? data.messages : []
    // Backend returns messages in DESC order; show ASC in UI
    setMessages([...list].reverse())
    await markSeen(u.id)
    // reset unread count for this user
    setUnreadCounts(prev => ({ ...prev, [u.id]: 0 }))
    setTimeout(scrollToBottom, 0)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const content = inputRef.current.value.trim()
    if(!content || !selectedUser) return
    // Create a temporary optimistic message
    const tempId = `temp-${Date.now()}`
    const tempMsg = {
      id: tempId,
      senderId: me?.id,
      receiverId: selectedUser.id,
      content,
      createdAt: new Date().toISOString(),
      _temp: true,
      _status: 'sending',
    }
    inputRef.current.value = ''
    setMessages(prev => [...prev, tempMsg])
    scrollToBottom()

    try{
      // Persist via REST; socket will also emit to both users
      const real = await sendMessageApi(selectedUser.id, content)
      setMessages(prev => {
        // remove temp
        const withoutTemp = prev.filter(m => m.id !== tempId)
        // if socket already added the real message, just return without temp
        if (withoutTemp.some(m => m.id === real.id)) return withoutTemp
        return dedupeById([...withoutTemp, real])
      })
      scrollToBottom()
    }catch(err){
      // mark temp as failed
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'failed' } : m))
    }
  }

  const scrollToBottom = () => {
    const el = messagesRef.current
    if(el) el.scrollTop = el.scrollHeight
  }

  if(loading){
    return <div className="min-h-screen grid place-items-center">Loading...</div>
  }

  return (
    <div className="h-[90vh] overflow-hidden grid grid-cols-1 md:grid-cols-[320px,1fr] min-h-0">
      {/* Sidebar */}
      <aside className="border-r bg-white flex flex-col px-2">
        <div className="p-3 border-b flex items-center gap-2">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search users" className="flex-1 border rounded px-3 py-2" />
          <button
            onClick={() => { logoutAuth(); disconnectSocket(); nav('/login', { replace: true }) }}
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
            title="Logout"
          >Logout</button>
        </div>
        <div className="divide-y flex-1 overflow-y-auto mt-4">
          {sidebarUsers.map(u => {
            const active = selectedUser?.id === u.id
            return (
            <button
              key={u.id}
              onClick={()=>openChat(u)}
              className={`w-full p-3 text-left flex items-center justify-between transition-colors mb-4 border-none ${active ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-blue-50 '} `}
            >
              <div>
                <div className="font-medium">{[u.firstName,u.lastName].filter(Boolean).join(' ') || u.email}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCounts[u.id] > 0 && !active && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] bg-red-500 text-white">
                    {unreadCounts[u.id]}
                  </span>
                )}
                <span className={`text-xs ${u.isOnline ? 'text-green-600' : 'text-gray-400'}`}>{u.isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </button>
            )
          })}
        </div>
      </aside>

      {/* Chat area */}
      <main className="grid grid-rows-[auto,1fr,auto] h-full min-h-0 overflow-hidden">
        <header className="p-3 border-b bg-white flex items-center justify-between">
          <div>
            <div className="font-semibold">{selectedUser ? ([selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || selectedUser.email) : 'Select a user'}</div>
            {selectedUser ? (
              <div className={`text-xs ${selectedUser.isOnline ? 'text-green-600' : 'text-gray-500'}`}>{selectedUser.isOnline ? 'Online' : 'Offline'}</div>
            ) : null}
          </div>
        </header>

        <div ref={messagesRef} className="min-h-0 overflow-y-auto p-4 pb-24 space-y-2 bg-gray-50">
          {selectedUser ? (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderId === me?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`${m.senderId === me?.id ? 'bg-blue-600 text-white' : 'bg-white border'} max-w-[70%] rounded px-3 py-2`}>
                  <div className="text-sm">{m.content}</div>
                  <div className="text-[10px] opacity-70 mt-1 flex items-center gap-2">
                    <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                    {m._status === 'sending' && <span className="italic text-gray-300">Sending…</span>}
                    {m._status === 'failed' && <span className="text-red-400">Failed</span>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-10">Choose a user to start chatting</div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t p-3 flex gap-2 bg-white shrink-0 sticky bottom-0 z-10">
          <input ref={inputRef} placeholder="Type a message" className="flex-1 border rounded px-3 py-2" />
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
        </form>
      </main>
    </div>
  )
}

// Helpers
function dedupeById(list){
  const seen = new Set()
  const out = []
  for(const m of list){
    if(m && m.id && !seen.has(m.id)){
      seen.add(m.id)
      out.push(m)
    }
  }
  return out
}
