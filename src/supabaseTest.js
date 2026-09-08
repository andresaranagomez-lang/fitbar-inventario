import { supabase } from './lib/supabaseClient'

export async function probarSupabase() {
  console.log('🔄 Probando conexión con Supabase...')

  const { data, error } = await supabase
    .from('productos')
    .select('*')

  if (error) {
    console.error('❌ Error de conexión con Supabase:', error)
    return
  }

  console.log('🟢 Conexión con Supabase correcta')
  console.log('📦 Productos encontrados:', data.length)
  console.log('📋 Datos:', data)
}