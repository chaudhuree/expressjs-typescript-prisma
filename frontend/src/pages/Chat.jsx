import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchUsers, fetchMe } from '../api/users'
import { listConversations, getMessages, markSeen, sendMessage as sendMessageApi } from '../api/chat'
import { getSocket, onMessageNew, onUserOnline, onUserOffline } from '../socket'

export default function Chat(){
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [conversations, setConversations] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)
  const messagesRef = useRef(null)
  const selectedUserRef = useRef(null)
  const meRef = useRef(null)

  const filteredUsers = useMemo(() => users.filter(u => u.id !== me?.id), [users, me])

  useEffect(() => {
    let unsub = []
    ;(async () => {
      try{
        setLoading(true)
        const [meData, usersData, convos] = await Promise.all([
          fetchMe(), fetchUsers(), listConversations()
        ])
        setMe(meData)
        setUsers(usersData)
        setConversations(convos || [])
      } finally { setLoading(false) }

      const s = getSocket()
      // Register listeners once; use refs to avoid stale closures
      unsub.push(onMessageNew(async ({ message }) => {
        const currentSelected = selectedUserRef.current
        const currentMe = meRef.current
        if(currentSelected && (message.senderId === currentSelected.id || message.receiverId === currentSelected.id)){
          setMessages(prev => dedupeById([...prev, message]))
          await markSeen(currentSelected.id)
          scrollToBottom()
        } else {
          const convos = await listConversations();
          setConversations(convos || [])
        }
      }))
      unsub.push(onUserOnline(async () => {
        const list = await fetchUsers({})
        setUsers(list)
      }))
      unsub.push(onUserOffline(async () => {
        const list = await fetchUsers({})
        setUsers(list)
      }))
    })()

    return () => { unsub.forEach(off => off && off()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep refs in sync
  useEffect(() => { selectedUserRef.current = selectedUser }, [selectedUser])
  useEffect(() => { meRef.current = me }, [me])

  // Server-side search with debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      const list = await fetchUsers(search ? { search } : {})
      setUsers(list)
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
    setTimeout(scrollToBottom, 0)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const content = inputRef.current.value.trim()
    if(!content || !selectedUser) return
    try{
      // Persist via REST; socket will also emit to both users
      const msg = await sendMessageApi(selectedUser.id, content)
      inputRef.current.value = ''
      setMessages(prev => dedupeById([...prev, msg]))
      scrollToBottom()
    }catch(err){
      alert(err.message || 'Failed to send message')
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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[320px,1fr]">
      {/* Sidebar */}
      <aside className="border-r bg-white">
        <div className="p-3 border-b">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search users" className="w-full border rounded px-3 py-2" />
        </div>
        <div className="divide-y max-h-[calc(100vh-60px)] overflow-y-auto">
          {filteredUsers.map(u => (
            <button key={u.id} onClick={()=>openChat(u)} className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between">
              <div>
                <div className="font-medium">{[u.firstName,u.lastName].filter(Boolean).join(' ') || u.email}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
              <span className={`text-xs ${u.isOnline ? 'text-green-600' : 'text-gray-400'}`}>{u.isOnline ? 'Online' : 'Offline'}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex flex-col">
        <header className="p-3 border-b bg-white flex items-center justify-between">
          <div>
            <div className="font-semibold">{selectedUser ? ([selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || selectedUser.email) : 'Select a user'}</div>
            {selectedUser ? (
              <div className={`text-xs ${selectedUser.isOnline ? 'text-green-600' : 'text-gray-500'}`}>{selectedUser.isOnline ? 'Online' : 'Offline'}</div>
            ) : null}
          </div>
        </header>

        <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
          {selectedUser ? (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderId === me?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`${m.senderId === me?.id ? 'bg-blue-600 text-white' : 'bg-white border'} max-w-[70%] rounded px-3 py-2`}>
                  <div className="text-sm">{m.content}</div>
                  <div className="text-[10px] opacity-70 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-10">Choose a user to start chatting</div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t p-3 flex gap-2 bg-white">
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
