import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Contar total
  const { count: total } = await supabase
    .from('Ruta')
    .select('*', { count: 'exact', head: true })
  console.log(`Total rutas: ${total}`)

  // Contar publicadas
  const { count: publicadas } = await supabase
    .from('Ruta')
    .select('*', { count: 'exact', head: true })
    .eq('publicada', true)
  console.log(`Rutas publicadas: ${publicadas}`)

  // Actualizar todas a publicada=true
  const { error, count: updated } = await supabase
    .from('Ruta')
    .update({ publicada: true })
    .eq('publicada', false)
    .select('id', { count: 'exact' })

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
  console.log(`Rutas actualizadas a publicada=true: ${updated}`)

  // Verificar
  const { count: ahora } = await supabase
    .from('Ruta')
    .select('*', { count: 'exact', head: true })
    .eq('publicada', true)
  console.log(`Rutas publicadas ahora: ${ahora}`)
}

main().catch(console.error)
