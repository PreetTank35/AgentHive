import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Todos List</h1>
      <ul className="space-y-2">
        {todos?.map((todo: { id: string | number; name: string }) => (
          <li key={todo.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">{todo.name}</li>
        ))}
      </ul>
    </div>
  )
}
